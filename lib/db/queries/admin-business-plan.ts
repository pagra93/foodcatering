/**
 * Queries del Business Plan / modelo financiero (super admin). Solo lee inputs
 * (escenarios, costes reales, snapshots). La proyección/métricas se recomputan
 * en el motor puro lib/finance/*.
 */

// Panel super-admin: lecturas globales a propósito → cliente sin guard de tenant.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
import { assumptionsSchema, type Assumptions } from '@/lib/validations/finance'
import { DEFAULT_ASSUMPTIONS } from '@/lib/finance/defaults'
import {
  getBillingMonthlySeries,
  getBillingDashboardKPIs,
} from '@/lib/db/queries/admin-billing'
import { getDashboardCharts } from '@/lib/db/queries/admin-dashboard'
import type { ActualsSeriesPoint } from '@/lib/finance/types'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export type ScenarioRow = {
  id: string
  key: string
  name: string
  description: string | null
  kind: 'BASE' | 'OPTIMISTIC' | 'PESSIMISTIC' | 'CUSTOM'
  isDefault: boolean
  startMonth: string
  horizonMonths: number
  assumptions: Assumptions
}

/** Parseo tolerante: si el JSON guardado es viejo/incompleto, cae a defaults. */
function parseAssumptions(raw: unknown): Assumptions {
  const res = assumptionsSchema.safeParse(raw)
  return res.success ? res.data : DEFAULT_ASSUMPTIONS
}

export async function getFinancialScenarios(): Promise<ScenarioRow[]> {
  const rows = await prisma.financialScenario.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    kind: r.kind,
    isDefault: r.isDefault,
    startMonth: r.startMonth,
    horizonMonths: r.horizonMonths,
    assumptions: parseAssumptions(r.assumptions),
  }))
}

export type ActualCosts = {
  cogs: number | null
  totalOpex: number | null
  headcount: number | null
}

/** Costes reales por período (introducidos a mano). */
export async function getFinancialActuals(): Promise<Map<string, ActualCosts>> {
  const rows = await prisma.financialActual.findMany()
  const map = new Map<string, ActualCosts>()
  for (const r of rows) {
    const cogsParts = [r.cogsHosting, r.cogsPayments, r.cogsSupport].filter((x) => x != null)
    const opexParts = [r.opexSales, r.opexRnd, r.opexGna].filter((x) => x != null)
    const cogs = cogsParts.length ? cogsParts.reduce((s, x) => s + Number(x), 0) : null
    const totalOpex = opexParts.length ? opexParts.reduce((s, x) => s + Number(x), 0) : null
    map.set(r.period, { cogs, totalOpex, headcount: r.headcount })
  }
  return map
}

export type ActualRow = {
  period: string
  cogsHosting: number | null
  cogsPayments: number | null
  cogsSupport: number | null
  opexSales: number | null
  opexRnd: number | null
  opexGna: number | null
  headcount: number | null
  notes: string | null
}

/** Filas de costes reales para el editor del admin. */
export async function getFinancialActualRows(): Promise<ActualRow[]> {
  const rows = await prisma.financialActual.findMany({ orderBy: { period: 'desc' } })
  const num = (x: unknown) => (x == null ? null : Number(x))
  return rows.map((r) => ({
    period: r.period,
    cogsHosting: num(r.cogsHosting),
    cogsPayments: num(r.cogsPayments),
    cogsSupport: num(r.cogsSupport),
    opexSales: num(r.opexSales),
    opexRnd: num(r.opexRnd),
    opexGna: num(r.opexGna),
    headcount: r.headcount,
    notes: r.notes,
  }))
}

/** Snapshots de MRR ya capturados (serie histórica hacia adelante). */
export async function getMrrSnapshots() {
  const rows = await prisma.mrrSnapshot.findMany({ orderBy: { period: 'asc' } })
  return rows.map((r) => ({
    period: r.period,
    mrr: Number(r.mrr),
    arr: Number(r.arr),
    activeCompanies: r.activeCompanies,
    activeCaterings: r.activeCaterings,
  }))
}

/**
 * Serie REAL fusionada para el Plan vs Real. Combina ingresos/GMV/crecimiento
 * reales (queries existentes) + snapshots de MRR + costes reales por mes.
 */
export async function getBusinessPlanActuals(): Promise<ActualsSeriesPoint[]> {
  const [series, charts, kpis, actuals, snapshots, anchor] = await Promise.all([
    getBillingMonthlySeries(),
    getDashboardCharts(),
    getBillingDashboardKPIs(),
    getFinancialActuals(),
    getMrrSnapshots(),
    getAnchor(),
  ])

  const now = currentMonth()
  const newByMonth = new Map(charts.companiesGrowth.new.map((r) => [r.month, r.count]))
  const churnByMonth = new Map(charts.companiesGrowth.churned.map((r) => [r.month, r.count]))
  const snapByPeriod = new Map(snapshots.map((s) => [s.period, s]))

  const periods = new Set<string>()
  for (const s of series) periods.add(s.period)
  for (const s of snapshots) periods.add(s.period)
  for (const p of actuals.keys()) periods.add(p)
  periods.add(now)

  const seriesByPeriod = new Map(series.map((s) => [s.period, s]))

  return [...periods]
    .sort()
    .map((period) => {
      const s = seriesByPeriod.get(period)
      const commissionRevenue = s?.commissions ?? 0
      const saasRevenue = s?.saas ?? 0
      const gmv = s?.gross ?? 0
      const totalRevenue = commissionRevenue + saasRevenue

      const snap = snapByPeriod.get(period)
      const isNow = period === now
      const mrrSaas = snap ? snap.mrr : isNow ? kpis.mrrSaas : null
      const activeCompanies = snap ? snap.activeCompanies : isNow ? anchor.companies : null
      const activeCaterings = snap ? snap.activeCaterings : isNow ? anchor.caterings : null

      const cost = actuals.get(period)
      const cogs = cost?.cogs ?? null
      const totalOpex = cost?.totalOpex ?? null
      const ebitda =
        cogs != null || totalOpex != null ? totalRevenue - (cogs ?? 0) - (totalOpex ?? 0) : null

      return {
        period,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        commissionRevenue: Math.round(commissionRevenue * 100) / 100,
        saasRevenue: Math.round(saasRevenue * 100) / 100,
        gmv: Math.round(gmv * 100) / 100,
        mrrSaas,
        activeCompanies,
        activeCaterings,
        newCompanies: newByMonth.get(period) ?? 0,
        churnedCompanies: churnByMonth.get(period) ?? 0,
        cogs,
        totalOpex,
        ebitda,
      }
    })
}

/** Ancla real del mes 0: empresas y caterings activos ahora. */
export async function getAnchor(): Promise<{ companies: number; caterings: number }> {
  const [companies, caterings] = await Promise.all([
    prisma.company.count({ where: { tenant: { status: 'ACTIVE', deletedAt: null } } }),
    prisma.tenant.count({ where: { type: 'CATERING', status: 'ACTIVE', deletedAt: null } }),
  ])
  return { companies, caterings }
}

export async function getFinancialScenario(key: string): Promise<ScenarioRow | null> {
  const r = await prisma.financialScenario.findUnique({ where: { key } })
  if (!r) return null
  return {
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    kind: r.kind,
    isDefault: r.isDefault,
    startMonth: r.startMonth,
    horizonMonths: r.horizonMonths,
    assumptions: parseAssumptions(r.assumptions),
  }
}
