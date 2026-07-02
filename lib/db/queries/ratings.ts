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

type SelectionCourse = { dishId?: string; name?: string } | null | undefined
type OrderSelection = { first?: SelectionCourse; second?: SelectionCourse; dessert?: SelectionCourse }

/** Extrae los platos (con curso) de `Order.selection`. */
export function dishesFromSelection(
  selection: Prisma.JsonValue
): { dishId: string; name: string; course: DishCourse }[] {
  const sel = (selection ?? {}) as OrderSelection
  const out: { dishId: string; name: string; course: DishCourse }[] = []
  const map: [keyof OrderSelection, DishCourse][] = [
    ['first', 'FIRST'],
    ['second', 'SECOND'],
    ['dessert', 'DESSERT'],
  ]
  for (const [key, course] of map) {
    const c = sel[key]
    if (c?.dishId) out.push({ dishId: c.dishId, name: c.name ?? 'Plato', course })
  }
  return out
}
