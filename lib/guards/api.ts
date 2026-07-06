/**
 * API Guards - Helpers para proteger API routes
 * 
 * Uso en API routes:
 * ```typescript
 * export async function POST(req: Request) {
 *   await requireAuth()
 *   await requireRoles(['ADMIN_EMPRESA', 'RRHH'])
 *   
 *   // ... lógica
 * }
 * ```
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole, canAccessTenant } from '@/lib/auth/permissions'
import type { UserRole } from '@prisma/client'

/**
 * Verifica que el usuario esté autenticado
 * Lanza error 401 si no lo está
 */
export async function requireAuth() {
  const session = await auth()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  return session
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos
 * Lanza error 403 si no tiene el rol
 */
export async function requireRoles(allowedRoles: UserRole[]) {
  const session = await requireAuth()

  const isAllowed = hasRole(session.user.role, allowedRoles)

  if (!isAllowed) {
    throw new Error('Forbidden: Insufficient role')
  }

  return session
}

/**
 * Verifica que el usuario tenga acceso al tenant especificado
 * Lanza error 403 si no tiene acceso
 */
export async function requireTenantAccess(targetTenantId: string) {
  const session = await requireAuth()

  if (
    !canAccessTenant(
      session.user.tenantId,
      session.user.role,
      targetTenantId
    )
  ) {
    throw new Error('Forbidden: No access to this tenant')
  }

  return session
}

/**
 * Verifica que el usuario sea super admin
 * Lanza error 403 si no lo es
 */
export async function requireSuperAdmin() {
  return requireRoles(['SUPER_ADMIN'])
}

/**
 * Middleware wrapper para API routes con manejo de errores
 * 
 * Uso:
 * ```typescript
 * export const POST = withAuth(async (req, session) => {
 *   // session está garantizado aquí
 *   return Response.json({ ok: true })
 * })
 * ```
 */
type ApiHandler = (
  req: Request,
  session: Awaited<ReturnType<typeof requireAuth>>
) => Promise<Response> | Response

export function withAuth(handler: ApiHandler) {
  return async (req: Request) => {
    try {
      const session = await requireAuth()
      return await handler(req, session)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          return NextResponse.json(
            { error: 'No autenticado' },
            { status: 401 }
          )
        }
        if (error.message.startsWith('Forbidden')) {
          return NextResponse.json(
            { error: error.message.replace('Forbidden: ', '') },
            { status: 403 }
          )
        }
      }

      console.error('[withAuth] Error:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware wrapper para API routes con verificación de rol
 */
export function withRoles(allowedRoles: UserRole[], handler: ApiHandler) {
  return async (req: Request) => {
    try {
      const session = await requireRoles(allowedRoles)
      return await handler(req, session)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          return NextResponse.json(
            { error: 'No autenticado' },
            { status: 401 }
          )
        }
        if (error.message.startsWith('Forbidden')) {
          return NextResponse.json(
            { error: 'No tienes permisos suficientes' },
            { status: 403 }
          )
        }
      }

      console.error('[withRoles] Error:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  }
}


