/**
 * Queries para /admin/quality/audits y /catering/calidad tab Auditorías.
 */

// Vistas de admin cross-tenant (KPIs y listados globales de auditorías): el
// cliente guardado bloquearía las lecturas sin filtro de tenant.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
import type { AuditType, Prisma } from '@prisma/client'

export type AuditFilters = {
  tenantCatering?: string
  auditType?: AuditType
  minScore?: number
  maxScore?: number
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
}

export async function getRestaurantAudits(filters: AuditFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25))

  const where: Prisma.RestaurantAuditWhereInput = {
    ...(filters.tenantCatering && { tenantCatering: filters.tenantCatering }),
    ...(filters.auditType && { auditType: filters.auditType }),
    ...(filters.minScore !== undefined && { score: { gte: filters.minScore } }),
    ...(filters.maxScore !== undefined && {
      score: { ...(filters.minScore !== undefined ? { gte: filters.minScore } : {}), lte: filters.maxScore },
    }),
    ...(filters.from && {
      auditedAt: { gte: filters.from, ...(filters.to && { lte: filters.to }) },
    }),
  }

  const [audits, total] = await Promise.all([
    prisma.restaurantAudit.findMany({
      where,
      orderBy: { auditedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.restaurantAudit.count({ where }),
  ])

  const cateringIds = [...new Set(audits.map((a) => a.tenantCatering))]
  const caterings = await prisma.tenant.findMany({
    where: { id: { in: cateringIds } },
    select: { id: true, name: true, subdomain: true },
  })
  const cateringById = new Map(caterings.map((c) => [c.id, c]))

  return {
    audits: audits.map((a) => ({
      ...a,
      catering: cateringById.get(a.tenantCatering) ?? null,
    })),
    total,
    page,
    pageSize,
  }
}

export async function getRestaurantAuditById(id: string) {
  const audit = await prisma.restaurantAudit.findUnique({ where: { id } })
  if (!audit) return null
  const catering = await prisma.tenant.findUnique({
    where: { id: audit.tenantCatering },
    select: { id: true, name: true, subdomain: true },
  })
  return { ...audit, catering }
}

export async function getAuditsKPIs() {
  const all = await prisma.restaurantAudit.findMany({
    select: { score: true, auditType: true, tenantCatering: true },
  })

  const total = all.length
  const avgScore =
    total === 0 ? 0 : all.reduce((s, a) => s + a.score, 0) / total
  const lowScore = all.filter((a) => a.score < 60).length

  // Caterings sin auditoría en los últimos 12 meses
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  // groupBy agrega en SQL; `findMany({ distinct })` sin el preview
  // nativeDistinct traería todas las auditorías del año a Node.
  const recent = await prisma.restaurantAudit.groupBy({
    by: ['tenantCatering'],
    where: { auditedAt: { gte: twelveMonthsAgo } },
  })
  const totalCaterings = await prisma.tenant.count({
    where: { type: 'CATERING', status: 'ACTIVE' },
  })
  const staleCount = Math.max(0, totalCaterings - recent.length)

  return {
    total,
    avgScore: Math.round(avgScore * 10) / 10,
    lowScore,
    stale: staleCount,
  }
}

/**
 * Auditorías de un catering concreto — usada por /catering/calidad.
 */
export async function getAuditsForCatering(tenantCatering: string) {
  return prisma.restaurantAudit.findMany({
    where: { tenantCatering },
    orderBy: { auditedAt: 'desc' },
  })
}
