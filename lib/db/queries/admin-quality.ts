/**
 * Queries para /admin/quality/* (dashboard, incidents cross-tenant, ratings).
 * Scope: SUPER_ADMIN / AUDITOR con visibilidad global.
 */

import { prisma } from '@/lib/db/prisma'
import type {
  IncidentSeverity,
  IncidentStatus,
  Prisma,
} from '@prisma/client'
import type { IncidentResolution } from '@/lib/incidents/constants'

// ─── Dashboard KPIs ─────────────────────────────────────────────────────

export async function getQualityDashboardKPIs() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    openIncidents,
    lowSeverity,
    mediumSeverity,
    highSeverity,
    avgRating,
    pendingAudits,
    pendingPenalties,
  ] = await Promise.all([
    prisma.incident.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.incident.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, severity: 'LOW' },
    }),
    prisma.incident.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, severity: 'MEDIUM' },
    }),
    prisma.incident.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, severity: 'HIGH' },
    }),
    prisma.orderRating.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _avg: { rating: true },
    }),
    prisma.restaurantAudit.count({
      where: { auditedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.penalty.count({ where: { status: 'PENDING' } }),
  ])

  return {
    openIncidents,
    incidentsBySeverity: {
      LOW: lowSeverity,
      MEDIUM: mediumSeverity,
      HIGH: highSeverity,
    },
    avgRating30d: avgRating._avg.rating
      ? Math.round(avgRating._avg.rating * 10) / 10
      : null,
    pendingAudits,
    pendingPenalties,
  }
}

// ─── Incidencias cross-tenant ───────────────────────────────────────────

export type IncidentFilters = {
  search?: string
  tenantEmpresa?: string
  tenantCatering?: string
  severity?: IncidentSeverity
  status?: IncidentStatus
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
}

export async function getGlobalIncidents(filters: IncidentFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25))

  const where: Prisma.IncidentWhereInput = {
    ...(filters.tenantEmpresa && { tenantEmpresa: filters.tenantEmpresa }),
    ...(filters.tenantCatering && { tenantCatering: filters.tenantCatering }),
    ...(filters.severity && { severity: filters.severity }),
    ...(filters.status && { status: filters.status }),
    ...(filters.from && {
      createdAt: { gte: filters.from, ...(filters.to && { lte: filters.to }) },
    }),
    ...(filters.search && {
      OR: [
        { type: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ],
    }),
  }

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.incident.count({ where }),
  ])

  // Enriquecer con nombres de tenants (una sola query batch).
  const tenantIds = [
    ...new Set(
      incidents.flatMap((i) => [i.tenantEmpresa, i.tenantCatering])
    ),
  ]
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true, type: true },
  })
  const nameById = new Map(tenants.map((t) => [t.id, t.name]))

  return {
    incidents: incidents.map((i) => ({
      ...i,
      empresaName: nameById.get(i.tenantEmpresa) ?? i.tenantEmpresa,
      cateringName: nameById.get(i.tenantCatering) ?? i.tenantCatering,
      daysOpen: Math.floor(
        (Date.now() - i.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
    })),
    total,
    page,
    pageSize,
  }
}

/**
 * Detalle completo de una incidencia (vista global SUPER_ADMIN, cross-tenant).
 * Resuelve nombres de empresa/catering, el pedido asociado y los usuarios
 * implicados (apertura / reporte / asignación). Devuelve null si no existe.
 */
export async function getGlobalIncidentById(id: string) {
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          employeeId: true,
          serviceDate: true,
          status: true,
          menuType: true,
          price: true,
        },
      },
    },
  })

  if (!incident) return null

  // Resolución (JSON) parseada a forma tipada.
  const resolution = (incident.resolution ?? null) as IncidentResolution | null

  // Nombres de tenants implicados.
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: [incident.tenantEmpresa, incident.tenantCatering] } },
    select: { id: true, name: true, type: true },
  })
  const nameById = new Map(tenants.map((t) => [t.id, t.name]))

  // Usuarios implicados (email en claro; el nombre va cifrado y no se muestra aquí).
  const userIds = [
    incident.openedBy,
    incident.reportedBy,
    incident.assignedTo,
    resolution?.resolvedBy,
  ].filter((v): v is string => Boolean(v))

  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      })
    : []
  const emailById = new Map(users.map((u) => [u.id, u.email]))

  return {
    ...incident,
    resolution,
    empresaName: nameById.get(incident.tenantEmpresa) ?? incident.tenantEmpresa,
    cateringName:
      nameById.get(incident.tenantCatering) ?? incident.tenantCatering,
    openedByEmail: emailById.get(incident.openedBy) ?? null,
    reportedByEmail: incident.reportedBy
      ? emailById.get(incident.reportedBy) ?? null
      : null,
    assignedToEmail: incident.assignedTo
      ? emailById.get(incident.assignedTo) ?? null
      : null,
    resolvedByEmail: resolution?.resolvedBy
      ? emailById.get(resolution.resolvedBy) ?? null
      : null,
    daysOpen: Math.floor(
      (Date.now() - incident.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }
}

export async function getGlobalIncidentsKPIs() {
  const [open, inProgress, resolved, compensated, avgResolution] =
    await Promise.all([
      prisma.incident.count({ where: { status: 'OPEN' } }),
      prisma.incident.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.incident.count({ where: { status: 'RESOLVED' } }),
      prisma.incident.count({ where: { status: 'COMPENSATED' } }),
      prisma.incident.findMany({
        where: {
          status: { in: ['RESOLVED', 'COMPENSATED'] },
          resolvedAt: { not: null },
        },
        select: { createdAt: true, resolvedAt: true },
        take: 200,
      }),
    ])

  const resolutionTimes = avgResolution
    .filter((i) => i.resolvedAt)
    .map((i) => i.resolvedAt!.getTime() - i.createdAt.getTime())
  const avgResolutionHours =
    resolutionTimes.length === 0
      ? 0
      : Math.round(
          resolutionTimes.reduce((s, v) => s + v, 0) /
            resolutionTimes.length /
            (1000 * 60 * 60)
        )

  return { open, inProgress, resolved, compensated, avgResolutionHours }
}

// ─── Ratings agregados ──────────────────────────────────────────────────

export async function getGlobalRatingStats() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [overall, overall30d, withComment, total] = await Promise.all([
    prisma.orderRating.aggregate({
      _avg: { rating: true, tasteRating: true, portionRating: true, presentationRating: true },
      _count: { _all: true },
    }),
    prisma.orderRating.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.orderRating.count({ where: { comment: { not: null } } }),
    prisma.orderRating.count(),
  ])

  return {
    averageRating: overall._avg.rating
      ? Math.round(overall._avg.rating * 10) / 10
      : null,
    averageTaste: overall._avg.tasteRating
      ? Math.round(overall._avg.tasteRating * 10) / 10
      : null,
    averagePortion: overall._avg.portionRating
      ? Math.round(overall._avg.portionRating * 10) / 10
      : null,
    averagePresentation: overall._avg.presentationRating
      ? Math.round(overall._avg.presentationRating * 10) / 10
      : null,
    totalRatings: total,
    ratingsLast30d: overall30d._count._all,
    avgRatingLast30d: overall30d._avg.rating
      ? Math.round(overall30d._avg.rating * 10) / 10
      : null,
    percentWithComment:
      total === 0 ? 0 : Math.round((withComment / total) * 100),
  }
}

/**
 * Rating medio por catering — para rankings Top/Bottom.
 * Cruza Order (donde vive tenantCatering) con OrderRating.
 */
export async function getRatingsByCatering(limit = 20) {
  // Agrupación manual para obtener nombre + avg.
  const ratings = await prisma.orderRating.findMany({
    include: {
      order: {
        select: { tenantCatering: true },
      },
    },
  })

  const byTenant = new Map<
    string,
    { count: number; sum: number; taste: number; portion: number; presentation: number }
  >()

  for (const r of ratings) {
    const t = r.order.tenantCatering
    const entry = byTenant.get(t) ?? {
      count: 0,
      sum: 0,
      taste: 0,
      portion: 0,
      presentation: 0,
    }
    entry.count += 1
    entry.sum += r.rating
    entry.taste += r.tasteRating ?? 0
    entry.portion += r.portionRating ?? 0
    entry.presentation += r.presentationRating ?? 0
    byTenant.set(t, entry)
  }

  const tenantIds = [...byTenant.keys()]
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true, subdomain: true },
  })
  const nameById = new Map(tenants.map((t) => [t.id, t]))

  const result = tenantIds.map((id) => {
    const e = byTenant.get(id)!
    return {
      tenantCatering: id,
      cateringName: nameById.get(id)?.name ?? id,
      subdomain: nameById.get(id)?.subdomain ?? '',
      avgRating: Math.round((e.sum / e.count) * 10) / 10,
      avgTaste: e.count ? Math.round((e.taste / e.count) * 10) / 10 : null,
      avgPortion: e.count ? Math.round((e.portion / e.count) * 10) / 10 : null,
      avgPresentation: e.count
        ? Math.round((e.presentation / e.count) * 10) / 10
        : null,
      totalRatings: e.count,
    }
  })

  return result
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, limit)
}

/**
 * Últimos comentarios con contexto (empleado anonimizado, plato…)
 * para el stream de la página de ratings.
 */
export async function getRecentRatingComments(limit = 20) {
  const comments = await prisma.orderRating.findMany({
    where: { comment: { not: null } },
    include: {
      order: { select: { tenantCatering: true, selection: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  const tenantIds = [...new Set(comments.map((c) => c.order.tenantCatering))]
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true },
  })
  const nameById = new Map(tenants.map((t) => [t.id, t.name]))

  return comments.map((c) => ({
    id: c.id,
    rating: c.rating,
    comment: c.comment,
    createdAt: c.createdAt,
    cateringName: nameById.get(c.order.tenantCatering) ?? c.order.tenantCatering,
  }))
}
