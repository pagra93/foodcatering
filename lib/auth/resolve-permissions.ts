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
    const keys = rps.map((rp) => rp.permission.key)

    // Colapsar a ['*'] SOLO si el rol cubre EXACTAMENTE todo el catálogo
    // (igualdad de conjunto, no por conteo). Evita colapsos accidentales.
    if (
      keys.length >= ALL_PERMISSION_KEYS.length &&
      ALL_PERMISSION_KEYS.every((k) => keys.includes(k))
    ) {
      return ['*']
    }

    // roleId presente ⇒ TERMINAL y fail-closed: 0 permisos = sin acceso. Nunca
    // cae al mapa estático (H1: un rol vacío creado sobre SUPER_ADMIN ya no
    // escala a acceso total).
    return keys
  }

  // Sólo usuarios SIN roleId (sesiones legacy) caen al mapa estático.
  if (role === 'SUPER_ADMIN') return ['*']
  return [...((PERMISSIONS[role] as readonly string[] | undefined) ?? [])]
}
