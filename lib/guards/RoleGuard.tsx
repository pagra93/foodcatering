/**
 * RoleGuard - Higher Order Component para proteger componentes por rol
 * 
 * Uso:
 * ```tsx
 * export default RoleGuard(
 *   MyComponent,
 *   ['ADMIN_EMPRESA', 'RRHH']
 * )
 * ```
 */

import React from 'react'
import { redirect } from 'next/navigation'
import { getRequiredSession } from '@/lib/auth/session'
import { hasRole } from '@/lib/auth/permissions'
import type { UserRole } from '@prisma/client'

type RoleGuardOptions = {
  allowedRoles: UserRole[]
  redirectTo?: string
  fallback?: React.ComponentType
}

/**
 * HOC que protege un componente Server verificando el rol del usuario
 */
export function RoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: RoleGuardOptions | UserRole[]
) {
  // Normalizar opciones
  const config: RoleGuardOptions = Array.isArray(options)
    ? { allowedRoles: options, redirectTo: '/unauthorized' }
    : { redirectTo: '/unauthorized', ...options }

  return async function GuardedComponent(props: P) {
    const session = await getRequiredSession()

    // Verificar si el rol del usuario está permitido
    const isAllowed = config.allowedRoles.some((role) =>
      hasRole(session.user.role, role)
    )

    if (!isAllowed) {
      // Si hay un fallback, mostrarlo
      if (config.fallback) {
        const Fallback = config.fallback
        return <Fallback />
      }

      // Si no, redirigir (redirectTo siempre tiene valor por defecto)
      redirect(config.redirectTo ?? '/unauthorized')
    }

    // Usuario autorizado, renderizar componente
    return <Component {...props} />
  }
}

/**
 * HOC más simple que solo verifica un rol
 */
export function RequireRole(role: UserRole | UserRole[]) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return RoleGuard(Component, {
      allowedRoles: Array.isArray(role) ? role : [role],
    })
  }
}

/**
 * HOC específicos para roles comunes
 */
export const RequireSuperAdmin = <P extends object>(
  Component: React.ComponentType<P>
) =>
  RoleGuard(Component, {
    allowedRoles: ['SUPER_ADMIN'],
    redirectTo: '/unauthorized',
  })

export const RequireAdminEmpresa = <P extends object>(
  Component: React.ComponentType<P>
) =>
  RoleGuard(Component, {
    allowedRoles: ['SUPER_ADMIN', 'ADMIN_EMPRESA'],
    redirectTo: '/unauthorized',
  })

export const RequireRRHH = <P extends object>(
  Component: React.ComponentType<P>
) =>
  RoleGuard(Component, {
    allowedRoles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'RRHH'],
    redirectTo: '/unauthorized',
  })

export const RequireAdminCatering = <P extends object>(
  Component: React.ComponentType<P>
) =>
  RoleGuard(Component, {
    allowedRoles: ['SUPER_ADMIN', 'ADMIN_CATERING'],
    redirectTo: '/unauthorized',
  })

