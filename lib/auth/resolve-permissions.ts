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
    const rps = await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permission: { select: { key: true } } },
    })
    if (rps.length > 0) {
      if (rps.length >= ALL_PERMISSION_KEYS.length) return ['*']
      return rps.map((rp) => rp.permission.key)
    }
  }

  // Fallback de transición (usuario sin roleId): mapa estático.
  if (role === 'SUPER_ADMIN') return ['*']
  return [...((PERMISSIONS[role] as readonly string[] | undefined) ?? [])]
}
