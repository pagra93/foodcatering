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

export async function getCateringQualityMetrics(
  tenantId: string
): Promise<CateringQuality> {
  const thirtyDaysAgo = subDays(startOfDay(new Date()), 30)

  const [total, delivered, incidents, ratingAgg] = await Promise.all([
    prisma.order.count({
      where: { tenantCatering: tenantId, serviceDate: { gte: thirtyDaysAgo }, deletedAt: null },
    }),
    prisma.order.count({
      where: {
        tenantCatering: tenantId,
        serviceDate: { gte: thirtyDaysAgo },
        status: 'DELIVERED',
        deletedAt: null,
      },
    }),
    prisma.incident.count({
      where: { tenantCatering: tenantId, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.orderRating.aggregate({
      where: { order: { tenantCatering: tenantId } },
      _avg: { rating: true },
      _count: true,
    }),
  ])

  return {
    ordersLast30Days: total,
    punctualityRate: total > 0 ? Math.round((delivered / total) * 100) : 100,
    incidentRate: total > 0 ? parseFloat(((incidents / total) * 100).toFixed(2)) : 0,
    averageRating: ratingAgg._avg.rating
      ? Math.round(ratingAgg._avg.rating * 10) / 10
      : null,
    ratingCount: ratingAgg._count,
  }
}
