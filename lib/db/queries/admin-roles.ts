/**
 * Queries para /admin/users/roles.
 *
 * Los roles son hardcoded (lib/auth/permissions.ts). Estas queries sólo
 * agregan datos de uso: cuántos usuarios tienen cada rol, última actividad,
 * distribución por tenant.
 */

import { prisma } from '@/lib/db/prisma'
import type { UserRole } from '@prisma/client'
import {
  PERMISSIONS,
  ROLE_DESCRIPTIONS,
  getRoleCategory,
} from '@/lib/auth/permissions'

export type RoleUsageStat = {
  role: UserRole
  category: 'ROOT' | 'EMPRESA' | 'CATERING'
  description: string
  permissionsCount: number
  usersCount: number
  lastActivityAt: Date | null
}

/**
 * Stats de uso para cada rol: cuántos usuarios tienen ese rol y cuándo
 * fue la última actividad registrada por cualquiera con ese rol.
 */
export async function getRoleUsageStats(): Promise<RoleUsageStat[]> {
  const allRoles = Object.keys(PERMISSIONS) as UserRole[]

  // Conteo de users activos por rol (excluye soft-deleted).
  const userCounts = await prisma.user.groupBy({
    by: ['role'],
    where: { deletedAt: null },
    _count: { _all: true },
  })
  const countByRole = new Map<UserRole, number>()
  for (const row of userCounts) {
    countByRole.set(row.role, row._count._all)
  }

  // Última actividad por rol: join implícito con audit_logs vía actorId.
  // Para simplificar, traemos el último log y deducimos el rol del actor
  // en una pasada. Si se vuelve costoso con volumen, migrar a un índice
  // materializado.
  const recentLogs = await prisma.auditLog.findMany({
    where: { timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
    orderBy: { timestamp: 'desc' },
    select: { actorId: true, timestamp: true },
    take: 1000,
  })
  const actorIds = [...new Set(recentLogs.map((l) => l.actorId))]
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, role: true },
  })
  const roleByActor = new Map(actors.map((a) => [a.id, a.role]))

  const lastActivityByRole = new Map<UserRole, Date>()
  for (const log of recentLogs) {
    const role = roleByActor.get(log.actorId)
    if (!role) continue
    if (!lastActivityByRole.has(role)) {
      lastActivityByRole.set(role, log.timestamp)
    }
  }

  return allRoles.map((role) => ({
    role,
    category: getRoleCategory(role),
    description: ROLE_DESCRIPTIONS[role] ?? '',
    permissionsCount: (PERMISSIONS[role] ?? []).length,
    usersCount: countByRole.get(role) ?? 0,
    lastActivityAt: lastActivityByRole.get(role) ?? null,
  }))
}

// ─── RBAC DINÁMICO (tablas Role/Permission) ─────────────────────────────────

/** Lista de roles (sistema + custom) con nº de permisos y de usuarios. */
export async function getRolesWithCounts() {
  const [roles, userCounts] = await Promise.all([
    prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        category: true,
        baseRole: true,
        isSystem: true,
        _count: { select: { permissions: true } },
      },
    }),
    prisma.user.groupBy({
      by: ['roleId'],
      where: { deletedAt: null, roleId: { not: null } },
      _count: { _all: true },
    }),
  ])

  const usersByRole = new Map(userCounts.map((u) => [u.roleId, u._count._all]))
  return roles.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    category: r.category,
    baseRole: r.baseRole,
    isSystem: r.isSystem,
    permissionsCount: r._count.permissions,
    usersCount: usersByRole.get(r.id) ?? 0,
  }))
}

/** Detalle de un rol + las claves de permiso que tiene asignadas. */
export async function getRoleDetail(roleId: string) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      category: true,
      baseRole: true,
      isSystem: true,
      permissions: { select: { permission: { select: { key: true } } } },
    },
  })
  if (!role) return null
  return {
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    category: role.category,
    baseRole: role.baseRole,
    isSystem: role.isSystem,
    permissionKeys: role.permissions.map((p) => p.permission.key),
  }
}

/** Catálogo de permisos agrupado por portal → recurso, para el selector. */
export async function getPermissionCatalogGrouped() {
  const perms = await prisma.permission.findMany({
    orderBy: [{ portal: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
    select: { id: true, key: true, resource: true, action: true, portal: true, description: true },
  })

  const byPortal = new Map<string, Map<string, typeof perms>>()
  for (const p of perms) {
    const portal = byPortal.get(p.portal) ?? new Map()
    const bucket = portal.get(p.resource) ?? []
    bucket.push(p)
    portal.set(p.resource, bucket)
    byPortal.set(p.portal, portal)
  }

  return Array.from(byPortal.entries()).map(([portal, resources]) => ({
    portal,
    resources: Array.from(resources.entries()).map(([resource, permissions]) => ({
      resource,
      permissions,
    })),
  }))
}

/**
 * Users que actualmente tienen un rol concreto — paginable.
 */
export async function getUsersByRole(role: UserRole, page = 1, pageSize = 25) {
  const where = { role, deletedAt: null }
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])
  return { users, total, page, pageSize }
}
