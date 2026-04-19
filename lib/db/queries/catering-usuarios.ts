/**
 * Queries para /catering/configuracion/usuarios.
 * Gestión de usuarios con los 5 roles CATERING:
 * ADMIN_CATERING, CHEF, COCINERO, REPARTIDOR, FINANZAS_CATERING.
 */

import { prisma } from '@/lib/db/prisma'
import type { UserRole, UserStatus, Prisma } from '@prisma/client'

/** Los 5 roles disponibles en tenants tipo CATERING. */
export const CATERING_ROLES: UserRole[] = [
  'ADMIN_CATERING',
  'CHEF',
  'COCINERO',
  'REPARTIDOR',
  'FINANZAS_CATERING',
]

export type CateringUserFilters = {
  search?: string
  role?: UserRole
  status?: UserStatus
  page?: number
  pageSize?: number
}

export async function getCateringUsers(
  tenantId: string,
  filters: CateringUserFilters = {}
) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25))

  const where: Prisma.UserWhereInput = {
    tenantId,
    deletedAt: null,
    role: filters.role ? filters.role : { in: CATERING_ROLES },
    ...(filters.status && { status: filters.status }),
    ...(filters.search && {
      OR: [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { nameEnc: { contains: filters.search, mode: 'insensitive' } },
      ],
    }),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return { users, total, page, pageSize }
}

export async function getCateringUsersKPIs(tenantId: string) {
  const baseWhere: Prisma.UserWhereInput = {
    tenantId,
    deletedAt: null,
    role: { in: CATERING_ROLES },
  }
  const [total, active, admins, chefs, cocineros, repartidores, finanzas] =
    await Promise.all([
      prisma.user.count({ where: baseWhere }),
      prisma.user.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      prisma.user.count({ where: { ...baseWhere, role: 'ADMIN_CATERING' } }),
      prisma.user.count({ where: { ...baseWhere, role: 'CHEF' } }),
      prisma.user.count({ where: { ...baseWhere, role: 'COCINERO' } }),
      prisma.user.count({ where: { ...baseWhere, role: 'REPARTIDOR' } }),
      prisma.user.count({
        where: { ...baseWhere, role: 'FINANZAS_CATERING' },
      }),
    ])
  return { total, active, admins, chefs, cocineros, repartidores, finanzas }
}

export async function getCateringPendingInvitations(tenantId: string) {
  return prisma.userInvitation.findMany({
    where: {
      tenantId,
      status: 'PENDING',
      role: { in: CATERING_ROLES },
      expiresAt: { gt: new Date() },
    },
    orderBy: { sentAt: 'desc' },
  })
}
