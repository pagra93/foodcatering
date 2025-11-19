/**
 * PermissionGuard - HOC para proteger componentes por permiso específico
 * 
 * Uso:
 * ```tsx
 * export default PermissionGuard(
 *   MyComponent,
 *   'orders:create'
 * )
 * ```
 */

import { redirect } from 'next/navigation'
import { getRequiredSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/permissions'

type PermissionGuardOptions = {
  permission: string
  redirectTo?: string
  fallback?: React.ComponentType
}

/**
 * HOC que protege un componente verificando un permiso específico
 */
export function PermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: PermissionGuardOptions | string
) {
  // Normalizar opciones
  const config: PermissionGuardOptions =
    typeof options === 'string'
      ? { permission: options, redirectTo: '/unauthorized' }
      : { redirectTo: '/unauthorized', ...options }

  return async function GuardedComponent(props: P) {
    const session = await getRequiredSession()

    // Verificar si el usuario tiene el permiso
    const allowed = hasPermission(session.user.role, config.permission)

    if (!allowed) {
      // Si hay un fallback, mostrarlo
      if (config.fallback) {
        const Fallback = config.fallback
        return <Fallback />
      }

      // Si no, redirigir
      redirect(config.redirectTo!)
    }

    // Usuario autorizado, renderizar componente
    return <Component {...props} />
  }
}

/**
 * Guard para múltiples permisos (requiere TODOS)
 */
export function RequireAllPermissions<P extends object>(
  Component: React.ComponentType<P>,
  permissions: string[]
) {
  return async function GuardedComponent(props: P) {
    const session = await getRequiredSession()

    // Verificar que tenga TODOS los permisos
    const hasAll = permissions.every((perm) =>
      hasPermission(session.user.role, perm)
    )

    if (!hasAll) {
      redirect('/unauthorized')
    }

    return <Component {...props} />
  }
}

/**
 * Guard para múltiples permisos (requiere AL MENOS UNO)
 */
export function RequireAnyPermission<P extends object>(
  Component: React.ComponentType<P>,
  permissions: string[]
) {
  return async function GuardedComponent(props: P) {
    const session = await getRequiredSession()

    // Verificar que tenga AL MENOS UNO
    const hasAny = permissions.some((perm) =>
      hasPermission(session.user.role, perm)
    )

    if (!hasAny) {
      redirect('/unauthorized')
    }

    return <Component {...props} />
  }
}

/**
 * Guards específicos para permisos comunes
 */
export const RequireOrdersCreate = <P extends object>(
  Component: React.ComponentType<P>
) => PermissionGuard(Component, 'orders:create')

export const RequireOrdersDelete = <P extends object>(
  Component: React.ComponentType<P>
) => PermissionGuard(Component, 'orders:delete')

export const RequireEmployeesManage = <P extends object>(
  Component: React.ComponentType<P>
) => PermissionGuard(Component, 'employees:write')

export const RequireDishesManage = <P extends object>(
  Component: React.ComponentType<P>
) => PermissionGuard(Component, 'dishes:write')

