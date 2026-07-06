/**
 * Resuelve los permisos efectivos de un usuario para guardarlos en la sesión.
 * Fuente: tabla RolePermission (rol dinámico). Si un rol cubre todo el catálogo
 * se colapsa a `['*']` para no inflar el JWT (caso super_admin).
 */

import { prisma } from '@/lib/db'
import type { UserRole } from '@prisma/client'
import { ALL_PERMISSION_KEYS } from './permission-catalog'
import { PERMISSIONS } from './permissions'

export async function resolveUserPermissions(
  roleId: string | null | undefined,
  role: UserRole
): Promise<string[]> {
  if (roleId) {
    const dbRole = await prisma.role.findUnique({
      where: { id: roleId },
      select: {
        isSystem: true,
        baseRole: true,
        permissions: { select: { permission: { select: { key: true } } } },
      },
    })

    if (dbRole) {
      // El super_admin DE SISTEMA siempre tiene acceso total, sin depender de que
      // el catálogo esté completamente sembrado (evita lockout tras cambios de
      // catálogo). Un rol A MEDIDA (isSystem=false) basado en SUPER_ADMIN NO
      // recibe este atajo: cierra la escalada por rol vacío (H1).
      if (dbRole.isSystem && dbRole.baseRole === 'SUPER_ADMIN') return ['*']

      const keys = dbRole.permissions.map((rp) => rp.permission.key)

      // Colapsar a ['*'] sólo si cubre EXACTAMENTE todo el catálogo.
      if (
        keys.length >= ALL_PERMISSION_KEYS.length &&
        ALL_PERMISSION_KEYS.every((k) => keys.includes(k))
      ) {
        return ['*']
      }

      // roleId presente ⇒ TERMINAL y fail-closed: 0 permisos = sin acceso. Nunca
      // cae al mapa estático.
      return keys
    }
  }

  // Sólo usuarios SIN roleId (o con un roleId inexistente) caen al mapa estático.
  if (role === 'SUPER_ADMIN') return ['*']
  return [...((PERMISSIONS[role] as readonly string[] | undefined) ?? [])]
}
