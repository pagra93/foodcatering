import 'server-only'
import pino from 'pino'
import { env } from '@/lib/env'

/**
 * Logger estructurado del servidor (JSON a stdout — Coolify lo captura y es
 * grep-able con `docker logs | jq`).
 *
 * - Nivel por `LOG_LEVEL` (lib/env.ts).
 * - `redact` como red de seguridad RGPD: aunque un objeto con PII acabe en un
 *   log, los campos sensibles salen `[REDACTED]` (se invierte en cifrar PII en
 *   BD; no puede fugarse por el canal de diagnóstico).
 * - Correlación: usa `withLogContext({ requestId, tenantId, userId })`.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    sha: process.env['BUILD_SHA'] ?? undefined,
  },
  redact: {
    paths: [
      'email',
      '*.email',
      'nameEnc',
      '*.nameEnc',
      'phoneEnc',
      '*.phoneEnc',
      'password',
      '*.password',
      'passwordHash',
      '*.passwordHash',
      'token',
      '*.token',
      'authorization',
      '*.authorization',
      'mfaSecret',
      '*.mfaSecret',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})

export type LogContext = {
  requestId?: string | null
  tenantId?: string | null
  userId?: string | null
  route?: string
}

/** Child logger con contexto de request (omite claves vacías). */
export function withLogContext(ctx: LogContext) {
  const bindings: Record<string, string> = {}
  for (const [key, value] of Object.entries(ctx)) {
    if (value) bindings[key] = value
  }
  return logger.child(bindings)
}
