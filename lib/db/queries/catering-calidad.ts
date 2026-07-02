/**
 * Queries para /catering/calidad — vista que tiene el propio catering sobre
 * su calidad: ratings, auditorías recibidas, penalizaciones aplicadas,
 * cumplimiento de SLA con cada cliente.
 *
 * Scope: filtrado por `tenantCatering` (el del catering logueado).
 */

import { prisma } from '@/lib/db/prisma'

export async function getCateringOwnRatingStats(tenantCatering: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const all = await prisma.orderRating.findMany({
    where: { order: { tenantCatering } },
    select: {
      rating: true,
      tasteRating: true,
      portionRating: true,
      presentationRating: true,
      createdAt: true,
    },
  })

  const total = all.length
  const avg = (
    values: Array<number | null>
  ): number | null => {
    const filtered = values.filter((v): v is number => v !== null)
    if (filtered.length === 0) return null
    return Math.round((filtered.reduce((s, v) => s + v, 0) / filtered.length) * 10) / 10
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
    averageTaste: avg(all.map((r) => r.tasteRating)),
    averagePortion: avg(all.map((r) => r.portionRating)),
    averagePresentation: avg(all.map((r) => r.presentationRating)),
    ratings30d: recent.length,
    avg30d: avg(recent.map((r) => r.rating)),
    avgThisWeek: avg(weekly.map((r) => r.rating)),
    avgPrevWeek: avg(prevWeek.map((r) => r.rating)),
  }
}

/**
 * Ratings agregados por plato del catering.
 */
export async function getCateringDishRatings(tenantCatering: string, limit = 10) {
  const ratings = await prisma.orderRating.findMany({
    where: { order: { tenantCatering } },
    include: {
      order: { select: { selection: true } },
    },
  })

  // Los pedidos guardan dish_ids en selection.dish_ids (JSON).
  const perDish = new Map<string, { sum: number; count: number }>()
  for (const r of ratings) {
    const sel = (r.order.selection as { dish_ids?: string[] } | null) ?? {}
    const ids = Array.isArray(sel.dish_ids) ? sel.dish_ids : []
    for (const id of ids) {
      const entry = perDish.get(id) ?? { sum: 0, count: 0 }
      entry.sum += r.rating
      entry.count += 1
      perDish.set(id, entry)
    }
  }

  const dishIds = [...perDish.keys()]
  if (dishIds.length === 0) return { top: [], bottom: [] }

  const dishes = await prisma.dish.findMany({
    where: { id: { in: dishIds } },
    select: { id: true, name: true, course: true },
  })
  const dishById = new Map(dishes.map((d) => [d.id, d]))

  const rows = dishIds
    .map((id) => {
      const e = perDish.get(id)!
      const d = dishById.get(id)
      return {
        dishId: id,
        name: d?.name ?? id,
        course: d?.course ?? 'FIRST',
        avgRating: Math.round((e.sum / e.count) * 10) / 10,
        ratings: e.count,
      }
    })
    .filter((r) => r.ratings >= 3) // mínimo 3 valoraciones para aparecer

  return {
    top: [...rows].sort((a, b) => b.avgRating - a.avgRating).slice(0, limit),
    bottom: [...rows].sort((a, b) => a.avgRating - b.avgRating).slice(0, limit),
  }
}

export async function getCateringRecentComments(
  tenantCatering: string,
  limit = 20
) {
  return prisma.orderRating.findMany({
    where: { order: { tenantCatering }, comment: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
    },
  })
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
