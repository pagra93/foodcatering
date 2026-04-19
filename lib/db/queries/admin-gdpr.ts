/**
 * Queries para gestión de solicitudes RGPD.
 */

import { prisma } from '@/lib/db/prisma'
import type { GdprRequestStatus, GdprRequestType, Prisma } from '@prisma/client'

export const GDPR_DUE_WARNING_DAYS = 5
export const GDPR_RESPONSE_DAYS = 30

export type GdprFilters = {
  status?: GdprRequestStatus
  type?: GdprRequestType
  tenantId?: string
  page?: number
  pageSize?: number
}

export async function getGdprRequests(filters: GdprFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25))

  const where: Prisma.GdprRequestWhereInput = {
    ...(filters.status && { status: filters.status }),
    ...(filters.type && { type: filters.type }),
    ...(filters.tenantId && { tenantId: filters.tenantId }),
  }

  const [requests, total] = await Promise.all([
    prisma.gdprRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.gdprRequest.count({ where }),
  ])

  const userIds = [...new Set(requests.flatMap((r) => [r.userId, r.requestedBy]))]
  const tenantIds = [...new Set(requests.map((r) => r.tenantId))]
  const [users, tenants] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, nameEnc: true, role: true },
    }),
    prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, type: true, subdomain: true },
    }),
  ])
  const userById = new Map(users.map((u) => [u.id, u]))
  const tenantById = new Map(tenants.map((t) => [t.id, t]))

  return {
    requests: requests.map((r) => ({
      ...r,
      subject: userById.get(r.userId) ?? null,
      requester: userById.get(r.requestedBy) ?? null,
      tenant: tenantById.get(r.tenantId) ?? null,
      daysLeft: Math.max(
        0,
        Math.ceil((r.dueBy.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      ),
    })),
    total,
    page,
    pageSize,
  }
}

export async function getGdprKPIs() {
  const now = new Date()
  const warningThreshold = new Date(
    now.getTime() + GDPR_DUE_WARNING_DAYS * 24 * 60 * 60 * 1000
  )

  const [pending, inProgress, resolved, rejected, nearDue, overdue] =
    await Promise.all([
      prisma.gdprRequest.count({ where: { status: 'PENDING' } }),
      prisma.gdprRequest.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.gdprRequest.count({ where: { status: 'RESOLVED' } }),
      prisma.gdprRequest.count({ where: { status: 'REJECTED' } }),
      prisma.gdprRequest.count({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueBy: { lte: warningThreshold, gte: now },
        },
      }),
      prisma.gdprRequest.count({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueBy: { lt: now },
        },
      }),
    ])

  return { pending, inProgress, resolved, rejected, nearDue, overdue }
}

/**
 * Genera el dump JSON de un usuario (solo sus datos propios).
 * Se usa en ACCESS y PORTABILITY.
 */
export async function buildUserDataDump(userId: string) {
  const [user, employee, ordersOwn, ratings, incidentsReported] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          nameEnc: true,
          phoneEnc: true,
          role: true,
          status: true,
          mfaEnabled: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
        },
      }),
      prisma.employee.findFirst({
        where: { userId },
        include: {
          site: { select: { name: true, address: true } },
        },
      }),
      prisma.order.findMany({
        where: { employeeId: { in: [] } }, // will be replaced
        orderBy: { serviceDate: 'desc' },
      }),
      prisma.orderRating.findMany({
        where: { employeeId: { in: [] } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.incident.findMany({
        where: { reportedBy: userId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

  if (!user) return null

  // Si es empleado, buscamos sus pedidos y ratings reales
  let orders = ordersOwn
  let employeeRatings = ratings
  if (employee) {
    ;[orders, employeeRatings] = await Promise.all([
      prisma.order.findMany({
        where: { employeeId: employee.id },
        orderBy: { serviceDate: 'desc' },
      }),
      prisma.orderRating.findMany({
        where: { employeeId: employee.id },
        orderBy: { createdAt: 'desc' },
      }),
    ])
  }

  return {
    exportedAt: new Date().toISOString(),
    subject: {
      id: user.id,
      email: user.email,
      name: user.nameEnc,
      phone: user.phoneEnc,
      role: user.role,
      status: user.status,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    employee: employee
      ? {
          id: employee.id,
          employeeNumber: employee.employeeNumber,
          department: employee.department,
          position: employee.position,
          startDate: employee.startDate,
          endDate: employee.endDate,
          dietPrefs: employee.dietPrefs,
          weeklyMenuDays: employee.weeklyMenuDays,
          site: employee.site,
        }
      : null,
    orders: orders.map((o) => ({
      id: o.id,
      serviceDate: o.serviceDate,
      selection: o.selection,
      price: o.price.toString(),
      menuType: o.menuType,
      status: o.status,
    })),
    ratings: employeeRatings.map((r) => ({
      orderId: r.orderId,
      rating: r.rating,
      tasteRating: r.tasteRating,
      portionRating: r.portionRating,
      presentationRating: r.presentationRating,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
    incidentsReported: incidentsReported.map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      description: i.description,
      status: i.status,
      createdAt: i.createdAt,
    })),
  }
}
