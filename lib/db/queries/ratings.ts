/**
 * Capa canónica de Reputación (fuente ÚNICA, reusada en los 4 portales).
 *
 * Se apoya en `DishRating` (valoración por plato, 1–5) con los campos
 * denormalizados `tenantCatering` / `tenantEmpresa` / `serviceDate`, lo que
 * permite agregar por catering, por empresa, por la relación catering×empresa
 * y por ventana temporal sin joins caros.
 *
 * Reemplaza la agregación por pedido (OrderRating) y la vista rota
 * `getCateringDishRatings` (leía `selection.dish_ids`, que no existe).
 */

import { prisma } from '@/lib/db/prisma'
import type { Prisma, DishCourse } from '@prisma/client'
import { subDays, startOfDay } from 'date-fns'
import { dishesFromSelection } from '@/lib/ratings/selection'

export { dishesFromSelection } from '@/lib/ratings/selection'

// ── Tipos ───────────────────────────────────────────────────────────────────

export type ReputationSummary = {
  average: number | null
  count: number
  /** Histograma de estrellas: { 1..5: nº }. */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

export type TrendPoint = { period: string; average: number; count: number }

export type DishScore = {
  dishId: string
  name: string
  course: DishCourse
  average: number
  count: number
}

export type EntityScore = {
  tenantId: string
  name: string
  average: number
  count: number
}

export type RatingComment = {
  id: string
  rating: number
  comment: string
  createdAt: Date
  dishName: string
  cateringName?: string
  empresaName?: string
}

const round1 = (n: number) => Math.round(n * 10) / 10

// ── Helpers internos ─────────────────────────────────────────────────────────

function emptyDistribution(): Record<1 | 2 | 3 | 4 | 5, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
}

/** Resumen (media + nº + histograma) para un `where` dado. */
async function summaryFor(
  where: Prisma.DishRatingWhereInput
): Promise<ReputationSummary> {
  const [agg, byStar] = await Promise.all([
    prisma.dishRating.aggregate({ where, _avg: { rating: true }, _count: true }),
    prisma.dishRating.groupBy({ by: ['rating'], where, _count: true }),
  ])
  const distribution = emptyDistribution()
  for (const row of byStar) {
    const star = row.rating as 1 | 2 | 3 | 4 | 5
    if (star >= 1 && star <= 5) distribution[star] = row._count
  }
  return {
    average: agg._avg.rating != null ? round1(agg._avg.rating) : null,
    count: agg._count,
    distribution,
  }
}

/** Tendencia mensual (YYYY-MM) a partir de las filas del `where` dado. */
async function trendByMonth(
  where: Prisma.DishRatingWhereInput,
  months = 6
): Promise<TrendPoint[]> {
  const from = startOfDay(subDays(new Date(), months * 31))
  const rows = await prisma.dishRating.findMany({
    where: { ...where, serviceDate: { gte: from } },
    select: { serviceDate: true, rating: true },
  })
  const buckets = new Map<string, { sum: number; count: number }>()
  for (const r of rows) {
    const key = r.serviceDate.toISOString().slice(0, 7) // YYYY-MM
    const b = buckets.get(key) ?? { sum: 0, count: 0 }
    b.sum += r.rating
    b.count += 1
    buckets.set(key, b)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, b]) => ({
      period,
      average: round1(b.sum / b.count),
      count: b.count,
    }))
}

/** Top/bottom platos para un `where` dado (mín. `minCount` valoraciones). */
async function dishLeaderboard(
  where: Prisma.DishRatingWhereInput,
  limit = 10,
  minCount = 1
): Promise<{ top: DishScore[]; bottom: DishScore[] }> {
  const grouped = await prisma.dishRating.groupBy({
    by: ['dishId', 'course'],
    where,
    _avg: { rating: true },
    _count: true,
  })
  const eligible = grouped.filter((g) => g._count >= minCount)
  if (eligible.length === 0) return { top: [], bottom: [] }

  const dishes = await prisma.dish.findMany({
    where: { id: { in: eligible.map((g) => g.dishId) } },
    select: { id: true, name: true },
  })
  const nameById = new Map(dishes.map((d) => [d.id, d.name]))

  const rows: DishScore[] = eligible.map((g) => ({
    dishId: g.dishId,
    name: nameById.get(g.dishId) ?? 'Plato eliminado',
    course: g.course,
    average: round1(g._avg.rating ?? 0),
    count: g._count,
  }))
  return {
    top: [...rows].sort((a, b) => b.average - a.average).slice(0, limit),
    bottom: [...rows].sort((a, b) => a.average - b.average).slice(0, limit),
  }
}

type CommentRow = RatingComment & { tenantCatering: string; tenantEmpresa: string }

/** Comentarios recientes para un `where` dado (con nombre del plato + tenants). */
async function commentsFor(
  where: Prisma.DishRatingWhereInput,
  limit = 20
): Promise<CommentRow[]> {
  const rows = await prisma.dishRating.findMany({
    where: { ...where, comment: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      tenantCatering: true,
      tenantEmpresa: true,
      dish: { select: { name: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment ?? '',
    createdAt: r.createdAt,
    dishName: r.dish.name,
    tenantCatering: r.tenantCatering,
    tenantEmpresa: r.tenantEmpresa,
  }))
}

/** Resuelve nombres de tenants (empresa/catering) en lote. */
async function tenantNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return new Map()
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  })
  return new Map(tenants.map((t) => [t.id, t.name]))
}

// ── Catering (su propia reputación) ──────────────────────────────────────────

export async function getCateringReputation(
  tenantCatering: string
): Promise<ReputationSummary & { trend: TrendPoint[] }> {
  const where = { tenantCatering }
  const [summary, trend] = await Promise.all([
    summaryFor(where),
    trendByMonth(where),
  ])
  return { ...summary, trend }
}

export function getCateringDishLeaderboard(
  tenantCatering: string,
  limit = 10
) {
  return dishLeaderboard({ tenantCatering }, limit)
}

/** Media por empresa cliente (cómo puntúa cada empresa a este catering). */
export async function getCateringReputationByCompany(
  tenantCatering: string
): Promise<EntityScore[]> {
  const grouped = await prisma.dishRating.groupBy({
    by: ['tenantEmpresa'],
    where: { tenantCatering },
    _avg: { rating: true },
    _count: true,
  })
  const names = await tenantNames(grouped.map((g) => g.tenantEmpresa))
  return grouped
    .map((g) => ({
      tenantId: g.tenantEmpresa,
      name: names.get(g.tenantEmpresa) ?? g.tenantEmpresa,
      average: round1(g._avg.rating ?? 0),
      count: g._count,
    }))
    .sort((a, b) => b.average - a.average)
}

export function getCateringComments(tenantCatering: string, limit = 20) {
  return commentsFor({ tenantCatering }, limit)
}

export type DishRow = {
  dishId: string
  name: string
  course: DishCourse
  average: number
  count: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
  trendDelta: number | null
  lastRatedAt: Date | null
}

/**
 * Todos los platos valorados de un catering (para tabla buscable/ordenable).
 * Parametrizado por tenantCatering → reusable desde admin (pasando el id del
 * catering) y desde el propio catering.
 */
export async function getCateringDishTable(
  tenantCatering: string
): Promise<DishRow[]> {
  const from62 = startOfDay(subDays(new Date(), 62))
  const where = { tenantCatering }
  const [base, dist, lastRows, trendRows] = await Promise.all([
    prisma.dishRating.groupBy({
      by: ['dishId', 'course'],
      where,
      _avg: { rating: true },
      _count: true,
    }),
    prisma.dishRating.groupBy({ by: ['dishId', 'rating'], where, _count: true }),
    prisma.dishRating.groupBy({ by: ['dishId'], where, _max: { createdAt: true } }),
    prisma.dishRating.findMany({
      where: { ...where, serviceDate: { gte: from62 } },
      select: { dishId: true, serviceDate: true, rating: true },
    }),
  ])
  if (base.length === 0) return []

  const names = new Map(
    (
      await prisma.dish.findMany({
        where: { id: { in: base.map((b) => b.dishId) } },
        select: { id: true, name: true },
      })
    ).map((d) => [d.id, d.name])
  )

  const distByDish = new Map<string, Record<1 | 2 | 3 | 4 | 5, number>>()
  for (const row of dist) {
    const d = distByDish.get(row.dishId) ?? emptyDistribution()
    const star = row.rating as 1 | 2 | 3 | 4 | 5
    if (star >= 1 && star <= 5) d[star] = row._count
    distByDish.set(row.dishId, d)
  }

  const lastByDish = new Map(lastRows.map((l) => [l.dishId, l._max.createdAt]))

  // Tendencia: bucket por plato→mes, delta de los 2 últimos meses con datos.
  const monthByDish = new Map<string, Map<string, { sum: number; count: number }>>()
  for (const r of trendRows) {
    const month = r.serviceDate.toISOString().slice(0, 7)
    const m = monthByDish.get(r.dishId) ?? new Map()
    const b = m.get(month) ?? { sum: 0, count: 0 }
    b.sum += r.rating
    b.count += 1
    m.set(month, b)
    monthByDish.set(r.dishId, m)
  }

  return base
    .map((b) => {
      const months = [...(monthByDish.get(b.dishId)?.entries() ?? [])].sort(
        ([a], [z]) => a.localeCompare(z)
      )
      const last = months[months.length - 1]
      const prev = months[months.length - 2]
      const trendDelta =
        last && prev
          ? round1(last[1].sum / last[1].count - prev[1].sum / prev[1].count)
          : null
      return {
        dishId: b.dishId,
        name: names.get(b.dishId) ?? 'Plato eliminado',
        course: b.course,
        average: round1(b._avg.rating ?? 0),
        count: b._count,
        distribution: distByDish.get(b.dishId) ?? emptyDistribution(),
        trendDelta,
        lastRatedAt: lastByDish.get(b.dishId) ?? null,
      }
    })
    .sort((a, z) => z.average - a.average)
}

export type DishDetail = {
  dishId: string
  name: string
  course: DishCourse
  summary: ReputationSummary
  trend: TrendPoint[]
  byCompany: EntityScore[]
  comments: RatingComment[]
}

/**
 * Detalle de un plato de un catering: distribución, tendencia mensual, desglose
 * por empresa y TODOS sus comentarios. Devuelve null si el plato no tiene
 * valoraciones bajo este catering (guard de scope → notFound en la página).
 */
export async function getCateringDishDetail(
  tenantCatering: string,
  dishId: string
): Promise<DishDetail | null> {
  const where = { tenantCatering, dishId }
  const [dish, summary] = await Promise.all([
    prisma.dish.findUnique({
      where: { id: dishId },
      select: { id: true, name: true, course: true },
    }),
    summaryFor(where),
  ])
  if (!dish || summary.count === 0) return null

  const [trend, byCompanyGrouped, rawComments] = await Promise.all([
    trendByMonth(where),
    prisma.dishRating.groupBy({
      by: ['tenantEmpresa'],
      where,
      _avg: { rating: true },
      _count: true,
    }),
    commentsFor(where, 200),
  ])

  const names = await tenantNames([
    ...byCompanyGrouped.map((g) => g.tenantEmpresa),
    ...rawComments.map((c) => c.tenantEmpresa),
  ])
  const byCompany = byCompanyGrouped
    .map((g) => ({
      tenantId: g.tenantEmpresa,
      name: names.get(g.tenantEmpresa) ?? g.tenantEmpresa,
      average: round1(g._avg.rating ?? 0),
      count: g._count,
    }))
    .sort((a, z) => z.average - a.average)

  const comments: RatingComment[] = rawComments.map((c) => ({
    id: c.id,
    rating: c.rating,
    comment: c.comment,
    createdAt: c.createdAt,
    dishName: c.dishName,
    empresaName: names.get(c.tenantEmpresa) ?? undefined,
  }))

  return {
    dishId: dish.id,
    name: dish.name,
    course: dish.course,
    summary,
    trend,
    byCompany,
    comments,
  }
}

// ── Empresa (cómo puntúan sus empleados al catering asignado) ────────────────

export async function getCompanyCateringReputation(tenantEmpresa: string): Promise<{
  summary: ReputationSummary
  trend: TrendPoint[]
  top: DishScore[]
  bottom: DishScore[]
  comments: RatingComment[]
}> {
  const where = { tenantEmpresa }
  const [summary, trend, leaderboard, comments] = await Promise.all([
    summaryFor(where),
    trendByMonth(where),
    dishLeaderboard(where, 5),
    commentsFor(where, 10),
  ])
  return { summary, trend, top: leaderboard.top, bottom: leaderboard.bottom, comments }
}

// ── Admin (global) ───────────────────────────────────────────────────────────

export function getGlobalReputation() {
  return summaryFor({})
}

export type CateringReputationRow = {
  tenantId: string
  name: string
  average: number
  count: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
  avg30d: number | null
  count30d: number
  trendDelta: number | null
  /** Desglose por empresa cliente (cómo puntúa cada una a este catering). */
  companies: EntityScore[]
  /** Platos de ESTE catering (los platos son por catering, no globales). */
  topDishes: DishScore[]
  bottomDishes: DishScore[]
}

/**
 * Vista de superadmin: una fila rica por catering (para tabla comparable +
 * buscable + ordenable), con drill-down por empresa y por plato. Los platos van
 * anidados dentro de su catering porque cada catering tiene los suyos.
 */
export async function getReputationOverview(): Promise<{
  global: ReputationSummary
  caterings: CateringReputationRow[]
}> {
  const from30 = startOfDay(subDays(new Date(), 30))
  const from62 = startOfDay(subDays(new Date(), 62))

  const [global, base, dist, byCompany, byDish, base30, trendRows] =
    await Promise.all([
      summaryFor({}),
      prisma.dishRating.groupBy({
        by: ['tenantCatering'],
        _avg: { rating: true },
        _count: true,
      }),
      prisma.dishRating.groupBy({
        by: ['tenantCatering', 'rating'],
        _count: true,
      }),
      prisma.dishRating.groupBy({
        by: ['tenantCatering', 'tenantEmpresa'],
        _avg: { rating: true },
        _count: true,
      }),
      prisma.dishRating.groupBy({
        by: ['tenantCatering', 'dishId', 'course'],
        _avg: { rating: true },
        _count: true,
      }),
      prisma.dishRating.groupBy({
        by: ['tenantCatering'],
        _avg: { rating: true },
        _count: true,
        where: { serviceDate: { gte: from30 } },
      }),
      prisma.dishRating.findMany({
        where: { serviceDate: { gte: from62 } },
        select: { tenantCatering: true, serviceDate: true, rating: true },
      }),
    ])

  // Nombres de tenants (caterings + empresas) y platos, en lote.
  const names = await tenantNames([
    ...base.map((b) => b.tenantCatering),
    ...byCompany.map((c) => c.tenantEmpresa),
  ])
  const dishRows = await prisma.dish.findMany({
    where: { id: { in: [...new Set(byDish.map((d) => d.dishId))] } },
    select: { id: true, name: true },
  })
  const dishName = new Map(dishRows.map((d) => [d.id, d.name]))

  // Distribución por catering.
  const distByCat = new Map<string, Record<1 | 2 | 3 | 4 | 5, number>>()
  for (const row of dist) {
    const d = distByCat.get(row.tenantCatering) ?? emptyDistribution()
    const star = row.rating as 1 | 2 | 3 | 4 | 5
    if (star >= 1 && star <= 5) d[star] = row._count
    distByCat.set(row.tenantCatering, d)
  }

  // Empresas por catering.
  const companiesByCat = new Map<string, EntityScore[]>()
  for (const c of byCompany) {
    const list = companiesByCat.get(c.tenantCatering) ?? []
    list.push({
      tenantId: c.tenantEmpresa,
      name: names.get(c.tenantEmpresa) ?? c.tenantEmpresa,
      average: round1(c._avg.rating ?? 0),
      count: c._count,
    })
    companiesByCat.set(c.tenantCatering, list)
  }

  // Platos por catering.
  const dishesByCat = new Map<string, DishScore[]>()
  for (const d of byDish) {
    const list = dishesByCat.get(d.tenantCatering) ?? []
    list.push({
      dishId: d.dishId,
      name: dishName.get(d.dishId) ?? 'Plato eliminado',
      course: d.course,
      average: round1(d._avg.rating ?? 0),
      count: d._count,
    })
    dishesByCat.set(d.tenantCatering, list)
  }

  // 30 días por catering.
  const base30ByCat = new Map(base30.map((b) => [b.tenantCatering, b]))

  // Tendencia: bucket por catering→mes, delta últimos 2 meses con datos.
  const monthByCat = new Map<string, Map<string, { sum: number; count: number }>>()
  for (const r of trendRows) {
    const month = r.serviceDate.toISOString().slice(0, 7)
    const m = monthByCat.get(r.tenantCatering) ?? new Map()
    const b = m.get(month) ?? { sum: 0, count: 0 }
    b.sum += r.rating
    b.count += 1
    m.set(month, b)
    monthByCat.set(r.tenantCatering, m)
  }

  const caterings: CateringReputationRow[] = base
    .map((b) => {
      const cat = b.tenantCatering
      const companies = (companiesByCat.get(cat) ?? []).sort(
        (a, z) => z.average - a.average
      )
      const dishes = dishesByCat.get(cat) ?? []
      const b30 = base30ByCat.get(cat)

      const months = [...(monthByCat.get(cat)?.entries() ?? [])].sort(
        ([a], [z]) => a.localeCompare(z)
      )
      const last = months[months.length - 1]
      const prev = months[months.length - 2]
      const trendDelta =
        last && prev
          ? round1(last[1].sum / last[1].count - prev[1].sum / prev[1].count)
          : null

      return {
        tenantId: cat,
        name: names.get(cat) ?? cat,
        average: round1(b._avg.rating ?? 0),
        count: b._count,
        distribution: distByCat.get(cat) ?? emptyDistribution(),
        avg30d: b30?._avg.rating != null ? round1(b30._avg.rating) : null,
        count30d: b30?._count ?? 0,
        trendDelta,
        companies,
        topDishes: [...dishes].sort((a, z) => z.average - a.average).slice(0, 5),
        bottomDishes: [...dishes].sort((a, z) => a.average - z.average).slice(0, 5),
      }
    })
    .sort((a, z) => z.average - a.average)

  return { global, caterings }
}

export async function getReputationByCatering(limit = 50): Promise<EntityScore[]> {
  const grouped = await prisma.dishRating.groupBy({
    by: ['tenantCatering'],
    _avg: { rating: true },
    _count: true,
  })
  const names = await tenantNames(grouped.map((g) => g.tenantCatering))
  return grouped
    .map((g) => ({
      tenantId: g.tenantCatering,
      name: names.get(g.tenantCatering) ?? g.tenantCatering,
      average: round1(g._avg.rating ?? 0),
      count: g._count,
    }))
    .sort((a, b) => b.average - a.average)
    .slice(0, limit)
}

export type MatrixCell = {
  tenantCatering: string
  tenantEmpresa: string
  average: number
  count: number
}

/** Matriz catering×empresa: calidad de servicio por cada relación. */
export async function getReputationCompanyMatrix(): Promise<{
  caterings: { id: string; name: string }[]
  empresas: { id: string; name: string }[]
  cells: MatrixCell[]
}> {
  const grouped = await prisma.dishRating.groupBy({
    by: ['tenantCatering', 'tenantEmpresa'],
    _avg: { rating: true },
    _count: true,
  })
  const names = await tenantNames([
    ...grouped.map((g) => g.tenantCatering),
    ...grouped.map((g) => g.tenantEmpresa),
  ])
  const cells: MatrixCell[] = grouped.map((g) => ({
    tenantCatering: g.tenantCatering,
    tenantEmpresa: g.tenantEmpresa,
    average: round1(g._avg.rating ?? 0),
    count: g._count,
  }))
  const caterings = [...new Set(grouped.map((g) => g.tenantCatering))].map((id) => ({
    id,
    name: names.get(id) ?? id,
  }))
  const empresas = [...new Set(grouped.map((g) => g.tenantEmpresa))].map((id) => ({
    id,
    name: names.get(id) ?? id,
  }))
  return { caterings, empresas, cells }
}

export async function getGlobalDishLeaderboard(limit = 10) {
  return dishLeaderboard({}, limit, 2)
}

export async function getGlobalRatingComments(limit = 20): Promise<RatingComment[]> {
  const comments = await commentsFor({}, limit)
  // Enriquecer con el nombre del catering para el stream global.
  const names = await tenantNames(comments.map((c) => c.tenantCatering))
  return comments.map((c) => ({
    id: c.id,
    rating: c.rating,
    comment: c.comment,
    createdAt: c.createdAt,
    dishName: c.dishName,
    cateringName: names.get(c.tenantCatering) ?? undefined,
  }))
}

// ── Empleado (pedidos entregados pendientes de valorar) ──────────────────────

export type PendingRatingOrder = {
  orderId: string
  serviceDate: Date
  dishes: { dishId: string; name: string; course: DishCourse }[]
}

/**
 * Pedidos DELIVERED del empleado que aún no ha valorado (ni un solo plato).
 * Devuelve los platos de `selection` para poblar el diálogo de valoración.
 */
export async function getEmployeePendingRatings(
  employeeId: string,
  limit = 20
): Promise<PendingRatingOrder[]> {
  const orders = await prisma.order.findMany({
    where: {
      employeeId,
      status: 'DELIVERED',
      deletedAt: null,
      dishRatings: { none: {} },
    },
    orderBy: { serviceDate: 'desc' },
    take: limit,
    select: { id: true, serviceDate: true, selection: true },
  })
  return orders.map((o) => ({
    orderId: o.id,
    serviceDate: o.serviceDate,
    dishes: dishesFromSelection(o.selection),
  }))
}
