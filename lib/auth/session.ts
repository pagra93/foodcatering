/**
 * Helpers para manejar sesiones
 * Server-side y Client-side
 */

import { auth } from './index'
import { redirect } from 'next/navigation'
import type { UserRole } from '@prisma/client'
import {
  canAccessTenant,
  permittedAction,
  getDashboardPath,
} from './permissions'

/**
 * Obtener sesión o redirigir a login
 * Usar en Server Components cuando se requiere auth
 */
export async function getRequiredSession() {
  const session = await auth()

  if (!session || !session.user) {
    redirect('/login')
  }

  return session
}

/**
 * Obtener sesión y verificar rol
 * Lanza error si el rol no coincide
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const session = await getRequiredSession()

  if (!allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized')
  }

  return session
}

/**
 * Obtener sesión y verificar permiso
 */
export async function requirePermission(
  permission: string,
  legacyRoles: readonly string[] = []
) {
  const session = await getRequiredSession()

  // Coherente con el middleware y con permittedAction: el super admin siempre
  // pasa; si la sesión es legacy (sin permissions[]) se cae a legacyRoles.
  if (session.user.role === 'SUPER_ADMIN') return session

  if (
    !permittedAction(
      session.user.permissions,
      session.user.role,
      permission,
      legacyRoles
    )
  ) {
    redirect('/unauthorized')
  }

  return session
}

/**
 * Verificar acceso a un tenant específico
 */
export async function requireTenantAccess(targetTenantId: string) {
  const session = await getRequiredSession()

  if (
    !canAccessTenant(
      session.user.tenantId,
      session.user.role,
      targetTenantId
    )
  ) {
    redirect('/unauthorized')
  }

  return session
}

/**
 * Obtener el contexto del tenant actual
 */
export async function getTenantContext() {
  const session = await getRequiredSession()

  return {
    tenantId: session.user.tenantId,
    tenantType: session.user.tenantType,
    userId: session.user.id,
    role: session.user.role,
  }
}

/**
 * Verificar si el usuario actual es super admin
 */
export async function isSuperAdmin() {
  const session = await auth()
  return session?.user?.role === 'SUPER_ADMIN'
}

/**
 * Redirigir al dashboard apropiado según el rol
 */
export async function redirectToDashboard() {
  const session = await getRequiredSession()
  const path = getDashboardPath(session.user.role, session.user.tenantType)
  redirect(path)
}

/**
 * TenantMismatchError — lanzado cuando un header 'x-tenant-id' no coincide
 * con el tenant de la sesión y el usuario no es SUPER_ADMIN.
 *
 * Las API routes deben capturar esto y responder 403.
 */
export class TenantMismatchError extends Error {
  readonly status = 403
  constructor(message = 'Tenant mismatch') {
    super(message)
    this.name = 'TenantMismatchError'
  }
}

/**
 * Devuelve el `tenantId` con el que se debe operar en una API route.
 *
 * Reglas:
 *   - Si no hay header `x-tenant-id` → devuelve `session.user.tenantId` (flujo habitual).
 *   - Si hay header y coincide con la sesión → devuelve ese valor.
 *   - Si hay header y NO coincide:
 *       - SUPER_ADMIN: se permite (habilitado para impersonación administrativa).
 *       - Cualquier otro rol: lanza `TenantMismatchError` (403).
 *
 * Este helper cierra el patrón de cross-tenant bypass donde una ruta leía el
 * header sin validar contra la sesión.
 */
export async function getScopedTenantId(req?: Request | { headers: Headers }): Promise<string> {
  const session = await getRequiredSession()
  const headerTenant = req?.headers.get('x-tenant-id') ?? null

  if (!headerTenant || headerTenant === session.user.tenantId) {
    return session.user.tenantId
  }

  if (session.user.role === 'SUPER_ADMIN') {
    return headerTenant
  }

  throw new TenantMismatchError()
}

