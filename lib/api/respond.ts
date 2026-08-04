import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { DomainError } from '@/lib/errors'
import { TenantMismatchError } from '@/lib/auth/session'
import { logger } from '@/lib/log'

/**
 * Respuestas de error homogéneas para TODAS las rutas de app/api.
 *
 * Contrato: el cuerpo de error es SIEMPRE `{ error: string }` (el cliente lo
 * lee con lib/utils/api-error#readApiError). Nunca se filtran mensajes internos
 * de Prisma/infra ni el array crudo de issues de Zod.
 */
export function apiError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

function formatZodError(error: ZodError): string {
  const issue = error.issues[0]
  if (!issue) return 'Datos inválidos'
  const path = issue.path.join('.')
  return path ? `${path}: ${issue.message}` : issue.message
}

/** Errores de control de flujo de Next (redirect/notFound): re-lanzar SIEMPRE. */
function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest
  return typeof digest === 'string' && digest.startsWith('NEXT_')
}

/**
 * Mapea cualquier excepción del handler a la respuesta correcta:
 * - Zod → 400 con el primer issue legible.
 * - DomainError → su status + su mensaje (validación de negocio).
 * - TenantMismatchError → 403 genérico.
 * - P2002/P2025 → 409 con mensaje de dominio (sin nombres de constraints).
 * - Resto → 500 genérico + log estructurado con requestId (el detalle vive en
 *   el log/Sentry, no en la respuesta).
 */
export function apiErrorFrom(
  error: unknown,
  ctx: { route: string; requestId?: string | null; fallback?: string }
): NextResponse {
  if (isNextControlFlow(error)) throw error
  if (error instanceof ZodError) return apiError(400, formatZodError(error))
  if (error instanceof DomainError) return apiError(error.status, error.message)
  if (error instanceof TenantMismatchError) {
    return apiError(403, 'No tienes acceso a este recurso')
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return apiError(409, 'Ya existe un registro con esos datos')
    }
    if (error.code === 'P2025') {
      return apiError(
        409,
        'El registro cambió o ya no existe; recarga e inténtalo de nuevo'
      )
    }
  }
  logger.error(
    { err: error, route: ctx.route, requestId: ctx.requestId ?? undefined },
    'api error'
  )
  return apiError(500, ctx.fallback ?? 'Error interno; inténtalo de nuevo')
}

/** requestId inyectado por el middleware (correlación de logs). */
export function requestIdFrom(req: Request): string | null {
  return req.headers.get('x-request-id')
}
