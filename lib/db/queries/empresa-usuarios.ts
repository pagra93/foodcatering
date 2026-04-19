/**
 * Queries para /empresa/configuracion/usuarios.
 * Gestión de usuarios con ROLES DE GESTIÓN de una empresa:
 * ADMIN_EMPRESA, RRHH, FINANZAS, MANAGER_SEDE.
 *
 * Los EMPLEADOs NO se gestionan aquí — viven en /empresa/empleados.
 */

import { prisma } from '@/lib/db/prisma'
import type { UserRole, UserStatus, Prisma } from '@prisma/client'

/** Roles de gestión de empresa (no incluye EMPLEADO). */
export const EMPRESA_MANAGEMENT_ROLES: UserRole[] = [
  'ADMIN_EMPRESA',
  'RRHH',
  'FINANZAS',
  'MANAGER_SEDE',
]

export type EmpresaUserFilters = {
  search?: string
  role?: UserRole
  status?: UserStatus
  page?: number
  pageSize?: number
}

export async function getEmpresaManagementUsers(
  tenantId: string,
  filters: EmpresaUserFilters = {}
) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25))

  const where: Prisma.UserWhereInput = {
    tenantId,
    deletedAt: null,
    role: filters.role
      ? filters.role
      : { in: EMPRESA_MANAGEMENT_ROLES },
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

export async function getEmpresaUsersKPIs(tenantId: string) {
  const baseWhere: Prisma.UserWhereInput = {
    tenantId,
    deletedAt: null,
    role: { in: EMPRESA_MANAGEMENT_ROLES },
  }
  const [total, active, admins, rrhh, finanzas, managers] = await Promise.all([
    prisma.user.count({ where: baseWhere }),
    prisma.user.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
    prisma.user.count({ where: { ...baseWhere, role: 'ADMIN_EMPRESA' } }),
    prisma.user.count({ where: { ...baseWhere, role: 'RRHH' } }),
    prisma.user.count({ where: { ...baseWhere, role: 'FINANZAS' } }),
    prisma.user.count({ where: { ...baseWhere, role: 'MANAGER_SEDE' } }),
  ])
  return { total, active, admins, rrhh, finanzas, managers }
}

/**
 * Invitaciones pendientes de aceptar para esta empresa, filtradas por
 * roles de gestión (no incluye invitaciones a empleados).
 */
export async function getEmpresaPendingInvitations(tenantId: string) {
  return prisma.userInvitation.findMany({
    where: {
      tenantId,
      status: 'PENDING',
      role: { in: EMPRESA_MANAGEMENT_ROLES },
      expiresAt: { gt: new Date() },
    },
    orderBy: { sentAt: 'desc' },
  })
}
