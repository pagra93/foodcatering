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
import { prismaAdmin } from '@/lib/db/prisma-admin'
import { Prisma, type PrismaClient, type DishCourse } from '@prisma/client'
import { subDays, startOfDay } from 'date-fns'

// Las funciones GLOBALES (admin, cross-tenant) leen sin filtro de tenant a
// propósito → usan el cliente sin guard (F5). Los helpers aceptan `db` para
// poder reutilizarlos tanto en modo scoped (prisma) como global (prismaAdmin).
type Db = PrismaClient
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
  where: Prisma.DishRatingWhereInput,
  db: Db = prisma
): Promise<ReputationSummary> {
  const [agg, byStar] = await Promise.all([
    db.dishRating.aggregate({ where, _avg: { rating: true }, _count: true }),
    db.dishRating.groupBy({ by: ['rating'], where, _count: true }),
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

/** Ámbito de valoraciones (siempre acotado por tenant/plato, nunca abierto). */
type RatingScope = {
  tenantCatering?: string
  tenantEmpresa?: string
  dishId?: string
}

/** Media mensual sin redondear, tal cual sale de BD. */
type RawMonthPoint = { period: string; average: number; count: number }

/** Condiciones SQL parametrizadas para un scope (filtros ligados, sin interpolar). */
function scopeConds(scope: RatingScope, from: Date): Prisma.Sql[] {
  const conds: Prisma.Sql[] = [Prisma.sql`service_date >= ${from}`]
  if (scope.tenantCatering)
    conds.push(Prisma.sql`tenant_catering = ${scope.tenantCatering}`)
  if (scope.tenantEmpresa)
    conds.push(Prisma.sql`tenant_empresa = ${scope.tenantEmpresa}`)
  if (scope.dishId) conds.push(Prisma.sql`dish_id = ${scope.dishId}`)
  return conds
}

/**
 * Tendencia mensual (YYYY-MM) agregada en BD con `date_trunc` (L12: antes se
 * traían todas las filas y se agrupaban en memoria).
 */
async function trendByMonth(
  scope: RatingScope,
  months = 6,
  db: Db = prisma
): Promise<TrendPoint[]> {
  const from = startOfDay(subDays(new Date(), months * 31))
  const rows = await db.$queryRaw<
    { period: string; average: number; count: bigint }[]
  >(Prisma.sql`
    SELECT to_char(date_trunc('month', service_date), 'YYYY-MM') AS period,
           AVG(rating)::float AS average,
           COUNT(*)::bigint AS count
    FROM dish_ratings
    WHERE ${Prisma.join(scopeConds(scope, from), ' AND ')}
    GROUP BY 1
    ORDER BY 1
  `)
  return rows.map((r) => ({
    period: r.period,
    average: round1(r.average),
    count: Number(r.count),
  }))
}

/**
 * Medias mensuales agregadas en BD agrupadas por una columna del allowlist
 * (`dish_id` | `tenant_catering`) + mes. Devuelve un Map keyed por esa columna
 * con sus puntos mensuales ordenados. Sustituye el bucketing en memoria (L12).
 */
async function monthlyBucketsBy(
  groupCol: 'dish_id' | 'tenant_catering',
  sinceDays: number,
  scope: RatingScope = {},
  db: Db = prisma
): Promise<Map<string, RawMonthPoint[]>> {
  const from = startOfDay(subDays(new Date(), sinceDays))
  const col = Prisma.raw(groupCol) // literal del allowlist, sin input externo
  const rows = await db.$queryRaw<
    { key: string; period: string; average: number; count: bigint }[]
  >(Prisma.sql`
    SELECT ${col} AS key,
           to_char(date_trunc('month', service_date), 'YYYY-MM') AS period,
           AVG(rating)::float AS average,
           COUNT(*)::bigint AS count
    FROM dish_ratings
    WHERE ${Prisma.join(scopeConds(scope, from), ' AND ')}
    GROUP BY ${col}, 2
    ORDER BY ${col}, 2
  `)
  const map = new Map<string, RawMonthPoint[]>()
  for (const r of rows) {
    const arr = map.get(r.key) ?? []
    arr.push({ period: r.period, average: r.average, count: Number(r.count) })
    map.set(r.key, arr)
  }
  return map
}

/** Delta de la media entre los dos últimos meses con datos (o null). */
function trendDeltaOf(points: RawMonthPoint[] | undefined): number | null {
  if (!points || points.length < 2) return null
  const last = points[points.length - 1]
  const prev = points[points.length - 2]
  if (!last || !prev) return null
  return round1(last.average - prev.average)
}

/** Top/bottom platos para un `where` dado (mín. `minCount` valoraciones). */
async function dishLeaderboard(
  where: Prisma.DishRatingWhereInput,
  limit = 10,
  minCount = 1,
  db: Db = prisma
): Promise<{ top: DishScore[]; bottom: DishScore[] }> {
  const grouped = await db.dishRating.groupBy({
    by: ['dishId', 'course'],
    where,
    _avg: { rating: true },
    _count: true,
  })
  const eligible = grouped.filter((g) => g._count >= minCount)
  if (eligible.length === 0) return { top: [], bottom: [] }

  const dishes = await db.dish.findMany({
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
  limit = 20,
  db: Db = prisma
): Promise<CommentRow[]> {
  const rows = await db.dishRating.findMany({
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
async function tenantNames(
  ids: string[],
  db: Db = prisma
): Promise<Map<string, string>> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return new Map()
  const tenants = await db.tenant.findMany({
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
  const where = { tenantCatering }
  const [base, dist, lastRows, trendByDish] = await Promise.all([
    prisma.dishRating.groupBy({
      by: ['dishId', 'course'],
      where,
      _avg: { rating: true },
      _count: true,
    }),
    prisma.dishRating.groupBy({ by: ['dishId', 'rating'], where, _count: true }),
    prisma.dishRating.groupBy({ by: ['dishId'], where, _max: { createdAt: true } }),
    monthlyBucketsBy('dish_id', 62, { tenantCatering }),
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

  return base
    .map((b) => ({
      dishId: b.dishId,
      name: names.get(b.dishId) ?? 'Plato eliminado',
      course: b.course,
      average: round1(b._avg.rating ?? 0),
      count: b._count,
      distribution: distByDish.get(b.dishId) ?? emptyDistribution(),
      // Delta de los 2 últimos meses con datos (agregado en BD).
      trendDelta: trendDeltaOf(trendByDish.get(b.dishId)),
      lastRatedAt: lastByDish.get(b.dishId) ?? null,
    }))
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
  return summaryFor({}, prismaAdmin)
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

  const [global, base, dist, byCompany, byDish, base30, trendByCat] =
    await Promise.all([
      summaryFor({}, prismaAdmin),
      prismaAdmin.dishRating.groupBy({
        by: ['tenantCatering'],
        _avg: { rating: true },
        _count: true,
      }),
      prismaAdmin.dishRating.groupBy({
        by: ['tenantCatering', 'rating'],
        _count: true,
      }),
      prismaAdmin.dishRating.groupBy({
        by: ['tenantCatering', 'tenantEmpresa'],
        _avg: { rating: true },
        _count: true,
      }),
      prismaAdmin.dishRating.groupBy({
        by: ['tenantCatering', 'dishId', 'course'],
        _avg: { rating: true },
        _count: true,
      }),
      prismaAdmin.dishRating.groupBy({
        by: ['tenantCatering'],
        _avg: { rating: true },
        _count: true,
        where: { serviceDate: { gte: from30 } },
      }),
      monthlyBucketsBy('tenant_catering', 62, {}, prismaAdmin),
    ])

  // Nombres de tenants (caterings + empresas) y platos, en lote.
  const names = await tenantNames(
    [...base.map((b) => b.tenantCatering), ...byCompany.map((c) => c.tenantEmpresa)],
    prismaAdmin
  )
  const dishRows = await prismaAdmin.dish.findMany({
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

  const caterings: CateringReputationRow[] = base
    .map((b) => {
      const cat = b.tenantCatering
      const companies = (companiesByCat.get(cat) ?? []).sort(
        (a, z) => z.average - a.average
      )
      const dishes = dishesByCat.get(cat) ?? []
      const b30 = base30ByCat.get(cat)

      // Delta de los 2 últimos meses con datos (agregado en BD).
      const trendDelta = trendDeltaOf(trendByCat.get(cat))

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
  const grouped = await prismaAdmin.dishRating.groupBy({
    by: ['tenantCatering'],
    _avg: { rating: true },
    _count: true,
  })
  const names = await tenantNames(
    grouped.map((g) => g.tenantCatering),
    prismaAdmin
  )
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
  const grouped = await prismaAdmin.dishRating.groupBy({
    by: ['tenantCatering', 'tenantEmpresa'],
    _avg: { rating: true },
    _count: true,
  })
  const names = await tenantNames(
    [...grouped.map((g) => g.tenantCatering), ...grouped.map((g) => g.tenantEmpresa)],
    prismaAdmin
  )
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
  return dishLeaderboard({}, limit, 2, prismaAdmin)
}

export async function getGlobalRatingComments(limit = 20): Promise<RatingComment[]> {
  const comments = await commentsFor({}, limit, prismaAdmin)
  // Enriquecer con el nombre del catering para el stream global.
  const names = await tenantNames(
    comments.map((c) => c.tenantCatering),
    prismaAdmin
  )
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
  // La forma canónica de `selection` solo lleva ids: hidratar los nombres de
  // BD para el diálogo de valoración (lookup acotado por id, exento del guard).
  const allDishIds = new Set<string>()
  for (const o of orders) {
    for (const d of dishesFromSelection(o.selection)) allDishIds.add(d.dishId)
  }
  const dishRows = allDishIds.size
    ? await prisma.dish.findMany({
        where: { id: { in: Array.from(allDishIds) } },
        select: { id: true, name: true },
      })
    : []
  const dishNames = new Map(dishRows.map((d) => [d.id, d.name]))

  return orders.map((o) => ({
    orderId: o.id,
    serviceDate: o.serviceDate,
    dishes: dishesFromSelection(o.selection, dishNames),
  }))
}
