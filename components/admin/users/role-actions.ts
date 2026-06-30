'use server'

/**
 * Server actions del RBAC dinámico: crear/editar/borrar roles y sus permisos.
 * Gate por permiso (role:create / role:edit / role:delete). Audita cada cambio.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequiredSession } from '@/lib/auth/session'
import { permissionsInclude } from '@/lib/auth/permissions'
import { logAudit } from '@/lib/auth/audit'
import { ALL_PERMISSION_KEYS } from '@/lib/auth/permission-catalog'
import { rolesByTenantType } from '@/lib/auth/permissions'
import { slugify } from '@/lib/validations/catering'
import type { TenantType, UserRole } from '@prisma/client'

type ActionResult = { ok?: boolean; error?: string; id?: string }

const roleSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio'),
  description: z.string().optional(),
  category: z.enum(['ROOT', 'EMPRESA', 'CATERING']),
  // Rol base del enum (compat con el enrutado y los checks por rol).
  baseRole: z.string().min(1, 'Elige un rol base'),
  permissionKeys: z.array(z.string()).default([]),
})

/** Valida que baseRole pertenezca a la categoría (mismo set que el tenant). */
function baseRoleValid(category: 'ROOT' | 'EMPRESA' | 'CATERING', baseRole: string): boolean {
  return rolesByTenantType(category as TenantType).includes(baseRole as UserRole)
}

const known = new Set(ALL_PERMISSION_KEYS)
const validKeys = (keys: string[]) => keys.filter((k) => known.has(k))

async function permIdsForKeys(keys: string[]): Promise<string[]> {
  const rows = await prisma.permission.findMany({
    where: { key: { in: validKeys(keys) } },
    select: { id: true },
  })
  return rows.map((r) => r.id)
}

async function uniqueRoleKey(name: string): Promise<string> {
  const base = slugify(name) || 'rol'
  let key = base
  let n = 1
  // Evitar colisión con roles existentes
  while (await prisma.role.findUnique({ where: { key }, select: { id: true } })) {
    n += 1
    key = `${base}-${n}`
  }
  return key
}

export async function createRole(input: unknown): Promise<ActionResult> {
  const session = await getRequiredSession()
  if (!permissionsInclude(session.user.permissions, 'role:create')) {
    return { error: 'No tienes permiso para crear roles.' }
  }
  const parsed = roleSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const { name, description, category, baseRole, permissionKeys } = parsed.data
  if (!baseRoleValid(category, baseRole)) {
    return { error: 'El rol base no corresponde a la categoría elegida.' }
  }
  const key = await uniqueRoleKey(name)
  const permIds = await permIdsForKeys(permissionKeys)

  const role = await prisma.role.create({
    data: {
      key,
      name,
      description: description || null,
      category,
      baseRole: baseRole as UserRole,
      isSystem: false,
      permissions: { create: permIds.map((permissionId) => ({ permissionId })) },
    },
  })

  await logAudit({
    tenantId: null,
    actorId: session.user.id,
    action: 'CREATE',
    entity: 'role',
    entityId: role.id,
    diff: { name, category, permissions: permIds.length },
  })
  revalidatePath('/admin/users/roles')
  return { ok: true, id: role.id }
}

export async function updateRole(roleId: string, input: unknown): Promise<ActionResult> {
  const session = await getRequiredSession()
  if (!permissionsInclude(session.user.permissions, 'role:edit')) {
    return { error: 'No tienes permiso para editar roles.' }
  }
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, isSystem: true },
  })
  if (!role) return { error: 'El rol no existe.' }

  const parsed = roleSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const { name, description, category, baseRole, permissionKeys } = parsed.data
  if (!role.isSystem && !baseRoleValid(category, baseRole)) {
    return { error: 'El rol base no corresponde a la categoría elegida.' }
  }

  const permIds = await permIdsForKeys(permissionKeys)

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: permIds.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    }),
    // En roles del sistema solo se editan los permisos (nombre/categoría/base bloqueados).
    prisma.role.update({
      where: { id: roleId },
      data: role.isSystem
        ? {}
        : { name, description: description || null, category, baseRole: baseRole as UserRole },
    }),
  ])

  await logAudit({
    tenantId: null,
    actorId: session.user.id,
    action: 'UPDATE',
    entity: 'role',
    entityId: roleId,
    diff: { permissions: permIds.length, isSystem: role.isSystem },
  })
  revalidatePath('/admin/users/roles')
  revalidatePath(`/admin/users/roles/${roleId}`)
  return { ok: true }
}

export async function deleteRole(roleId: string): Promise<ActionResult> {
  const session = await getRequiredSession()
  if (!permissionsInclude(session.user.permissions, 'role:delete')) {
    return { error: 'No tienes permiso para eliminar roles.' }
  }
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { isSystem: true, _count: { select: { users: true } } },
  })
  if (!role) return { error: 'El rol no existe.' }
  if (role.isSystem) return { error: 'No se puede eliminar un rol del sistema.' }
  if (role._count.users > 0) {
    return { error: 'El rol tiene usuarios asignados; reasígnalos antes de borrarlo.' }
  }

  await prisma.role.delete({ where: { id: roleId } })
  await logAudit({
    tenantId: null,
    actorId: session.user.id,
    action: 'DELETE',
    entity: 'role',
    entityId: roleId,
  })
  revalidatePath('/admin/users/roles')
  return { ok: true }
}
