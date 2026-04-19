/**
 * Queries para /admin/users/roles y /admin/users/permissions.
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
