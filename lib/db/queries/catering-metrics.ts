/**
 * Métricas de calidad de un catering, calculadas EN VIVO (definición única).
 *
 * Antes: puntualidad/incidencias se calculaban en el detalle pero la lista leía
 * los campos stored de Restaurant (stale), y el rating venía siempre del stored
 * `averageRating` (nunca recalculado) → números distintos entre pantallas.
 * Esta es la fuente única para detalle y lista del admin.
 */

import { prisma } from '@/lib/db/prisma'
import { subDays, startOfDay } from 'date-fns'

export type CateringQuality = {
  ordersLast30Days: number
  punctualityRate: number // %
  incidentRate: number // %
  averageRating: number | null
  ratingCount: number
}

const EMPTY_QUALITY: CateringQuality = {
  ordersLast30Days: 0,
  punctualityRate: 100,
  incidentRate: 0,
  averageRating: null,
  ratingCount: 0,
}

/**
 * Variante batch: métricas de VARIOS caterings con una query agregada por
 * métrica en TOTAL (pedidos por estado, incidencias, ratings) en vez de
 * 4 queries POR catering. Misma definición que la individual.
 */
export async function getCateringsQualityMetrics(
  cateringTenantIds: string[]
): Promise<Map<string, CateringQuality>> {
  const result = new Map<string, CateringQuality>()
  if (cateringTenantIds.length === 0) return result

  const thirtyDaysAgo = subDays(startOfDay(new Date()), 30)

  const [ordersByStatus, incidentsByTenant, ratingsByTenant] =
    await Promise.all([
      // Total y entregados salen de la misma query (conteo por estado).
      prisma.order.groupBy({
        by: ['tenantCatering', 'status'],
        where: {
          tenantCatering: { in: cateringTenantIds },
          serviceDate: { gte: thirtyDaysAgo },
          deletedAt: null,
        },
        _count: { _all: true },
      }),
      prisma.incident.groupBy({
        by: ['tenantCatering'],
        where: {
          tenantCatering: { in: cateringTenantIds },
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { _all: true },
      }),
      // Reputación desde DishRating (valoración por plato, fuente única).
      prisma.dishRating.groupBy({
        by: ['tenantCatering'],
        where: { tenantCatering: { in: cateringTenantIds } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ])

  const orderTotals = new Map<string, { total: number; delivered: number }>()
  for (const row of ordersByStatus) {
    const acc = orderTotals.get(row.tenantCatering) ?? {
      total: 0,
      delivered: 0,
    }
    acc.total += row._count._all
    if (row.status === 'DELIVERED') acc.delivered += row._count._all
    orderTotals.set(row.tenantCatering, acc)
  }
  const incidentsMap = new Map(
    incidentsByTenant.map((i) => [i.tenantCatering, i._count._all])
  )
  const ratingsMap = new Map(
    ratingsByTenant.map((r) => [
      r.tenantCatering,
      { avg: r._avg.rating, count: r._count._all },
    ])
  )

  for (const tenantId of cateringTenantIds) {
    const { total, delivered } = orderTotals.get(tenantId) ?? {
      total: 0,
      delivered: 0,
    }
    const incidents = incidentsMap.get(tenantId) ?? 0
    const rating = ratingsMap.get(tenantId)

    result.set(tenantId, {
      ordersLast30Days: total,
      punctualityRate: total > 0 ? Math.round((delivered / total) * 100) : 100,
      incidentRate:
        total > 0 ? parseFloat(((incidents / total) * 100).toFixed(2)) : 0,
      averageRating: rating?.avg ? Math.round(rating.avg * 10) / 10 : null,
      ratingCount: rating?.count ?? 0,
    })
  }

  return result
}

export async function getCateringQualityMetrics(
  tenantId: string
): Promise<CateringQuality> {
  const metrics = await getCateringsQualityMetrics([tenantId])
  return metrics.get(tenantId) ?? EMPTY_QUALITY
}
