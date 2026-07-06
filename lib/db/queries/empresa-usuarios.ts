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

  const search = filters.search?.trim().toLowerCase()

  const where: Prisma.UserWhereInput = {
    tenantId,
    deletedAt: null,
    role: filters.role
      ? filters.role
      : { in: EMPRESA_MANAGEMENT_ROLES },
    ...(filters.status && { status: filters.status }),
  }

  // Sin búsqueda: paginación en BD (rápido).
  if (!search) {
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

  // Con búsqueda: el nombre está cifrado y no se puede filtrar en SQL. Traemos
  // los usuarios del tenant (el middleware de Prisma descifra nameEnc) y
  // filtramos por email/nombre en servidor. Lista acotada por tenant.
  const all = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  const matched = all.filter(
    (u) =>
      u.email.toLowerCase().includes(search) ||
      (u.nameEnc ? u.nameEnc.toLowerCase().includes(search) : false)
  )
  const total = matched.length
  const users = matched.slice(
    (page - 1) * pageSize,
    (page - 1) * pageSize + pageSize
  )
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
