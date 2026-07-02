/**
 * Queries para /catering/calidad — vista que tiene el propio catering sobre
 * su calidad: ratings, auditorías recibidas, penalizaciones aplicadas,
 * cumplimiento de SLA con cada cliente.
 *
 * Scope: filtrado por `tenantCatering` (el del catering logueado).
 */

import { prisma } from '@/lib/db/prisma'
import type { DishScore } from '@/lib/db/queries/ratings'
import {
  getCateringDishLeaderboard,
  getCateringComments,
} from '@/lib/db/queries/ratings'

export async function getCateringOwnRatingStats(tenantCatering: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Reputación por plato (DishRating). Las dimensiones sabor/porción/presentación
  // del antiguo OrderRating ya no existen a nivel de plato → null.
  const all = await prisma.dishRating.findMany({
    where: { tenantCatering },
    select: { rating: true, createdAt: true },
  })

  const total = all.length
  const avg = (values: number[]): number | null => {
    if (values.length === 0) return null
    return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
  }

  const recent = all.filter((r) => r.createdAt >= thirtyDaysAgo)
  const weekly = all.filter((r) => r.createdAt >= sevenDaysAgo)
  const prevWeek = all.filter(
    (r) =>
      r.createdAt < sevenDaysAgo &&
      r.createdAt >= new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000)
  )

  return {
    total,
    averageRating: avg(all.map((r) => r.rating)),
    averageTaste: null,
    averagePortion: null,
    averagePresentation: null,
    ratings30d: recent.length,
    avg30d: avg(recent.map((r) => r.rating)),
    avgThisWeek: avg(weekly.map((r) => r.rating)),
    avgPrevWeek: avg(prevWeek.map((r) => r.rating)),
  }
}

/**
 * Ratings agregados por plato del catering (fuente: DishRating, vía capa canónica).
 * Mantiene la forma { top, bottom } con { dishId, name, course, avgRating, ratings }.
 */
export async function getCateringDishRatings(tenantCatering: string, limit = 10) {
  const { top, bottom } = await getCateringDishLeaderboard(tenantCatering, limit)
  const shape = (d: DishScore) => ({
    dishId: d.dishId,
    name: d.name,
    course: d.course,
    avgRating: d.average,
    ratings: d.count,
  })
  return { top: top.map(shape), bottom: bottom.map(shape) }
}

export async function getCateringRecentComments(
  tenantCatering: string,
  limit = 20
) {
  const comments = await getCateringComments(tenantCatering, limit)
  return comments.map((c) => ({
    id: c.id,
    rating: c.rating,
    comment: c.comment,
    createdAt: c.createdAt,
    dishName: c.dishName,
  }))
}

/**
 * Penalizaciones aplicadas al propio catering con toda la info que
 * necesita para revisar y, si procede, disputar.
 */
export async function getOwnPenalties(tenantCatering: string) {
  return prisma.penalty.findMany({
    where: { tenantCatering },
    orderBy: { appliedAt: 'desc' },
  })
}

/** Una penalización del propio catering (scoped por tenant). */
export async function getOwnPenaltyById(id: string, tenantCatering: string) {
  return prisma.penalty.findFirst({ where: { id, tenantCatering } })
}

export async function getOwnPenaltiesKPIs(tenantCatering: string) {
  const [pending, applied, disputed, waived, pendingSum] = await Promise.all([
    prisma.penalty.count({ where: { tenantCatering, status: 'PENDING' } }),
    prisma.penalty.count({ where: { tenantCatering, status: 'APPLIED' } }),
    prisma.penalty.count({ where: { tenantCatering, status: 'DISPUTED' } }),
    prisma.penalty.count({ where: { tenantCatering, status: 'WAIVED' } }),
    prisma.penalty.aggregate({
      where: {
        tenantCatering,
        status: { in: ['PENDING', 'APPLIED'] },
      },
      _sum: { amount: true },
    }),
  ])
  return {
    pending,
    applied,
    disputed,
    waived,
    activeSum: pendingSum._sum.amount ?? 0,
  }
}

/**
 * SLA por cliente — una fila por CompanyCateringAssignment activo.
 * Cumplimiento real calculado sobre los últimos 30 días:
 * - punctualityRate: % de pedidos DELIVERED (simplificación; ideal con DeliveryProof)
 * - incidentRate: % de pedidos con incidencia asociada
 */
export async function getSlaByClient(tenantCatering: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const assignments = await prisma.companyCateringAssignment.findMany({
    where: { tenantCatering, active: true },
    include: {
      company: { select: { id: true, legalName: true, tenantId: true } },
    },
  })

  const results = []
  for (const a of assignments) {
    const where = {
      tenantCatering,
      tenantEmpresa: a.tenantEmpresa,
      serviceDate: { gte: thirtyDaysAgo },
    }
    const [totalOrders, delivered, incidents] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.incident.count({
        where: {
          tenantCatering,
          tenantEmpresa: a.tenantEmpresa,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ])

    const realPunctuality =
      totalOrders === 0 ? null : Math.round((delivered / totalOrders) * 1000) / 10
    const realIncidentRate =
      totalOrders === 0 ? null : Math.round((incidents / totalOrders) * 1000) / 10

    const slaPunctuality = a.slaPunctuality ? Number(a.slaPunctuality) : null
    const slaIncidentRate = a.slaIncidentRate ? Number(a.slaIncidentRate) : null

    const punctualityOk =
      realPunctuality === null ||
      slaPunctuality === null ||
      realPunctuality >= slaPunctuality
    const incidentOk =
      realIncidentRate === null ||
      slaIncidentRate === null ||
      realIncidentRate <= slaIncidentRate

    results.push({
      assignmentId: a.id,
      companyName: a.company.legalName,
      companyTenantId: a.tenantEmpresa,
      type: a.type,
      slaPunctuality,
      slaIncidentRate,
      realPunctuality,
      realIncidentRate,
      totalOrders,
      incidents,
      punctualityOk,
      incidentOk,
      overallOk: punctualityOk && incidentOk,
    })
  }

  return results
}
