/**
 * Helpers para manejar sesiones
 * Server-side y Client-side
 */

import { auth } from './index'
import { redirect } from 'next/navigation'
import type { UserRole, TenantType } from '@prisma/client'
import {
  canAccessTenant,
  hasPermission,
  getDashboardPath,
} from './permissions'

/**
 * Obtener sesión o redirigir a login
 * Usar en Server Components cuando se requiere auth
 */
export async function getRequiredSession() {
  const session = await auth()

  if (!session || !session.user) {
    redirect('/auth/login')
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
export async function requirePermission(permission: string) {
  const session = await getRequiredSession()

  if (!hasPermission(session.user.role, permission)) {
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

