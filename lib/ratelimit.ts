/**
 * Rate limiting con ventana fija en memoria.
 *
 * Adecuado para **single-instance** (dev, Docker en Coolify con 1 replica).
 * Para clusters / múltiples instancias sustituir por Upstash Ratelimit + Redis
 * (dejamos la interfaz `RateLimiter` estable para que el swap sea trivial).
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
  /** Devuelve snapshot de buckets activos. Útil para /admin/operations. */
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

/** Login / autenticación: 5 intentos por minuto por IP. */
export const authRateLimiter: RateLimiter = new InMemoryRateLimiter(5, 60_000, 'auth')

/** Impersonación (administrativa): 3 por hora por usuario. */
export const impersonationRateLimiter: RateLimiter = new InMemoryRateLimiter(
  3,
  60 * 60_000,
  'impersonation'
)

/** Exports pesados (CSV/ERP): 10 por hora por tenant. */
export const exportRateLimiter: RateLimiter = new InMemoryRateLimiter(
  10,
  60 * 60_000,
  'export'
)

/** Lista de todos los limiters activos (para inspector global). */
export const ALL_RATE_LIMITERS: Record<string, RateLimiter> = {
  auth: authRateLimiter,
  impersonation: impersonationRateLimiter,
  export: exportRateLimiter,
}

/**
 * Extrae una clave de rate limiting razonable para un request.
 * Usa el primer IP de `x-forwarded-for`, `x-real-ip` o la conexión.
 */
export function getRateLimitKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
