import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'

/**
 * Exige que el llamante sea SUPER_ADMIN (o que lleve el permiso en su lista RBAC).
 *
 * Pensado para el inicio de las Server Actions de administración: son endpoints
 * POST invocables directamente por cualquier cliente, así que deben autorizar
 * por su cuenta — proteger solo el render de la página (GET) no basta.
 *
 * Lanza si no hay sesión o falta el permiso. El fallback por rol (`['SUPER_ADMIN']`)
 * cubre las sesiones legacy sin `permissions[]` sin dejar pasar a otros roles.
 */
export async function requireSuperAdmin(
  permission: string
): Promise<Session['user']> {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (
    !permittedAction(
      session.user.permissions,
      session.user.role,
      permission,
      ['SUPER_ADMIN']
    )
  ) {
    throw new Error('No tienes permiso para esta acción')
  }
  return session.user
}
