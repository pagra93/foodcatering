/**
 * Rate limiting con ventana fija. Dos backends tras la misma interfaz:
 *
 * - **In-memory** (default): válido para una réplica. Los buckets se pierden
 *   en cada deploy.
 * - **Redis** (si `REDIS_URL` está definida): contadores compartidos entre
 *   réplicas — precondición para escalar horizontalmente. Ante cualquier fallo
 *   de Redis se DEGRADA al limitador in-memory del propio proceso (mejor un
 *   límite local que bloquear logins por una caída de Redis).
 *
 * Uso en una API route:
 *
 *   import { authRateLimiter, getRateLimitKey } from '@/lib/ratelimit'
 *
 *   export async function POST(req: NextRequest) {
 *     const result = await authRateLimiter.check(getRateLimitKey(req))
 *     if (!result.allowed) {
 *       return NextResponse.json(
 *         { error: 'Demasiados intentos, espera un momento' },
 *         { status: 429, headers: { 'Retry-After': String(result.resetIn) } }
 *       )
 *     }
 *     // ... lógica normal
 *   }
 */

import Redis from 'ioredis'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  /** Segundos hasta que se resetee la ventana. */
  resetIn: number
}

export type RateLimitEntry = {
  key: string
  count: number
  limit: number
  resetIn: number
  blocked: boolean
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>
  /**
   * Devuelve snapshot de buckets activos. Útil para /admin/operations.
   * Con backend Redis solo refleja los buckets del PROCESO local (los de
   * fallback); el estado compartido vive en Redis.
   */
  inspect(): RateLimitEntry[]
  /** Elimina la ventana para una key concreta (desbloqueo manual). */
  reset(key: string): void
  /** Config pública para UI (limit, window en segundos). */
  readonly config: { limit: number; windowSeconds: number; name: string }
}

type Bucket = {
  count: number
  resetAt: number
}

class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly name: string
  ) {}

  get config() {
    return {
      limit: this.limit,
      windowSeconds: Math.round(this.windowMs / 1000),
      name: this.name,
    }
  }

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now()
    const bucket = this.buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs })
      if (this.buckets.size > 10_000) this.gc(now)
      return { allowed: true, remaining: this.limit - 1, resetIn: Math.ceil(this.windowMs / 1000) }
    }

    bucket.count += 1
    const resetIn = Math.ceil((bucket.resetAt - now) / 1000)
    if (bucket.count > this.limit) {
      return { allowed: false, remaining: 0, resetIn }
    }
    return { allowed: true, remaining: this.limit - bucket.count, resetIn }
  }

  inspect(): RateLimitEntry[] {
    const now = Date.now()
    const entries: RateLimitEntry[] = []
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) continue // expirado pero aún no purgado
      entries.push({
        key,
        count: bucket.count,
        limit: this.limit,
        resetIn: Math.ceil((bucket.resetAt - now) / 1000),
        blocked: bucket.count > this.limit,
      })
    }
    return entries.sort((a, b) => b.count - a.count)
  }

  reset(key: string): void {
    this.buckets.delete(key)
  }

  private gc(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key)
    }
  }
}

// ─── Backend Redis (opcional) ───────────────────────────────────────────────

let redisClient: Redis | null = null
let redisWarned = false

function getRedis(): Redis | null {
  const url = process.env['REDIS_URL']
  if (!url) return null
  if (!redisClient) {
    redisClient = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      // Sin cola offline: si Redis no está, el comando falla rápido y se
      // degrada al limitador in-memory en vez de encolar indefinidamente.
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 500, 10_000),
    })
    redisClient.on('error', (err) => {
      if (!redisWarned) {
        redisWarned = true
        // eslint-disable-next-line no-console
        console.warn(
          `[ratelimit] Redis no disponible (${err.message}); degradando a in-memory`
        )
      }
    })
  }
  return redisClient
}

class RedisRateLimiter implements RateLimiter {
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly name: string,
    private readonly fallback: InMemoryRateLimiter
  ) {}

  get config() {
    return {
      limit: this.limit,
      windowSeconds: Math.round(this.windowMs / 1000),
      name: this.name,
    }
  }

  async check(key: string): Promise<RateLimitResult> {
    const client = getRedis()
    if (!client) return this.fallback.check(key)
    try {
      const redisKey = `rl:${this.name}:${key}`
      const results = await client
        .multi()
        .incr(redisKey)
        .pttl(redisKey)
        .exec()
      const count = Number(results?.[0]?.[1] ?? 1)
      let ttlMs = Number(results?.[1]?.[1] ?? -1)
      if (ttlMs < 0) {
        // Primera petición de la ventana (o expiry perdido): fijarlo.
        await client.pexpire(redisKey, this.windowMs)
        ttlMs = this.windowMs
      }
      const resetIn = Math.max(1, Math.ceil(ttlMs / 1000))
      if (count > this.limit) {
        return { allowed: false, remaining: 0, resetIn }
      }
      return { allowed: true, remaining: Math.max(0, this.limit - count), resetIn }
    } catch {
      // Redis caído/inaccesible → límite local del proceso (fail-open parcial).
      return this.fallback.check(key)
    }
  }

  inspect(): RateLimitEntry[] {
    return this.fallback.inspect()
  }

  reset(key: string): void {
    const client = getRedis()
    if (client) {
      void client.del(`rl:${this.name}:${key}`).catch(() => undefined)
    }
    this.fallback.reset(key)
  }
}

/** Elige backend según entorno: Redis compartido si hay REDIS_URL. */
function createRateLimiter(
  limit: number,
  windowMs: number,
  name: string
): RateLimiter {
  const memory = new InMemoryRateLimiter(limit, windowMs, name)
  if (!process.env['REDIS_URL']) return memory
  return new RedisRateLimiter(limit, windowMs, name, memory)
}

/** Login / autenticación: 5 intentos por minuto por IP. */
export const authRateLimiter: RateLimiter = createRateLimiter(5, 60_000, 'auth')

/**
 * Login por EMAIL (independiente de la IP): corta el password spraying
 * distribuido contra una misma cuenta aunque el atacante rote IPs/cabeceras.
 */
export const authEmailRateLimiter: RateLimiter = createRateLimiter(
  10,
  15 * 60_000,
  'auth-email'
)

/** Impersonación (administrativa): 3 por hora por usuario. */
export const impersonationRateLimiter: RateLimiter = createRateLimiter(
  3,
  60 * 60_000,
  'impersonation'
)

/** Exports pesados (CSV/ERP): 10 por hora por tenant. */
export const exportRateLimiter: RateLimiter = createRateLimiter(
  10,
  60 * 60_000,
  'export'
)

/** Lista de todos los limiters activos (para inspector global). */
export const ALL_RATE_LIMITERS: Record<string, RateLimiter> = {
  auth: authRateLimiter,
  'auth-email': authEmailRateLimiter,
  impersonation: impersonationRateLimiter,
  export: exportRateLimiter,
}

/**
 * Extrae una clave de rate limiting razonable para un request.
 *
 * Usa el ÚLTIMO elemento de `x-forwarded-for`: es el que añade NUESTRO proxy
 * (Traefik en Coolify) con la IP real del peer. El primer elemento lo controla
 * el cliente (puede enviar la cabecera ya rellena) y usarlo permitiría rotar
 * la clave en cada request para evadir el límite.
 */
export function getRateLimitKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    const last = parts[parts.length - 1]
    if (last) return last
  }
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
