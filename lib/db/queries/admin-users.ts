/**
 * Queries para /admin/users/* (Portal Súper Admin).
 *
 * Scope: SUPER_ADMIN y AUDITOR pueden ver usuarios de TODOS los tenants.
 * Estas queries NO aplican filtro de tenant — es lo esperado en el portal
 * root. El middleware dev de Prisma avisará y es falso positivo en este
 * contexto.
 */

// F5: panel admin = lecturas cross-tenant a propósito → cliente sin guard.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
import type { UserRole, UserStatus, TenantType, Prisma } from '@prisma/client'

export type AdminUserFilters = {
  /** Búsqueda libre por email o nombre. */
  search?: string
  /** Filtrar por tipo de tenant del usuario (ROOT / EMPRESA / CATERING). */
  tenantType?: TenantType
  /** Filtrar por tenant concreto. */
  tenantId?: string
  /** Filtrar por rol. */
  role?: UserRole
  /** Filtrar por estado. */
  status?: UserStatus
  /** Mostrar eliminados (soft-deleted). Por defecto: false. */
  includeDeleted?: boolean
  page?: number
  pageSize?: number
}

export async function getAllUsers(filters: AdminUserFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25))

  const search = filters.search?.trim().toLowerCase()

  const where: Prisma.UserWhereInput = {
    deletedAt: filters.includeDeleted ? undefined : null,
    ...(filters.role && { role: filters.role }),
    ...(filters.status && { status: filters.status }),
    ...(filters.tenantId && { tenantId: filters.tenantId }),
    ...(filters.tenantType && {
      tenant: { type: filters.tenantType },
    }),
  }

  const includeTenant = {
    tenant: {
      select: { id: true, name: true, type: true, subdomain: true },
    },
  } as const

  // Sin búsqueda: paginación en BD (rápido).
  if (!search) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: includeTenant,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ])
    return { users, total, page, pageSize }
  }

  // Con búsqueda: el nombre está cifrado y no se puede filtrar en SQL. Este
  // portal es cross-tenant (todos los usuarios), así que acotamos el escaneo en
  // memoria; el middleware de Prisma descifra nameEnc y filtramos en servidor.
  const SCAN_CAP = 5000
  const scanned = await prisma.user.findMany({
    where,
    include: includeTenant,
    orderBy: { createdAt: 'desc' },
    take: SCAN_CAP,
  })
  const matched = scanned.filter(
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

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          type: true,
          subdomain: true,
          status: true,
        },
      },
      employees: {
        include: {
          site: { select: { id: true, name: true } },
        },
      },
    },
  })
}

/**
 * Última actividad registrada en audit_logs para un usuario.
 * Devuelve null si nunca ha generado un evento.
 */
export async function getUserLastActivity(userId: string) {
  const log = await prisma.auditLog.findFirst({
    where: { actorId: userId },
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true, action: true, entity: true },
  })
  return log
}

/**
 * Stats globales de usuarios por estado — para KPIs del /admin/users.
 */
export async function getAdminUsersKPIs() {
  const [total, active, disabled, pending, byTenantType] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
    prisma.user.count({ where: { deletedAt: null, status: 'DISABLED' } }),
    prisma.user.count({ where: { deletedAt: null, status: 'PENDING' } }),
    prisma.user.groupBy({
      by: ['tenantId'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ])

  return {
    total,
    active,
    disabled,
    pending,
    distinctTenants: byTenantType.length,
  }
}
