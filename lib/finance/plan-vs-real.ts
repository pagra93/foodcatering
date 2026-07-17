/**
 * Comparación planificado vs real. Pura y testeable: cruza la proyección con la
 * serie real por período y métrica, y calcula varianza + semáforo.
 */

import type {
  MonthlyProjection,
  ActualsSeriesPoint,
  MetricKey,
  PlanVsRealRow,
} from './types'

const PLANNED: Record<MetricKey, (p: MonthlyProjection) => number> = {
  totalRevenue: (p) => p.totalRevenue,
  mrrSaas: (p) => p.mrrSaas,
  commissionRevenue: (p) => p.commissionRevenue,
  saasRevenue: (p) => p.mrrSaas,
  gmv: (p) => p.gmv,
  activeCompanies: (p) => p.activeCompanies,
  activeCaterings: (p) => p.activeCaterings,
}

const ACTUAL: Record<MetricKey, (a: ActualsSeriesPoint) => number | null> = {
  totalRevenue: (a) => a.totalRevenue,
  mrrSaas: (a) => a.mrrSaas,
  commissionRevenue: (a) => a.commissionRevenue,
  saasRevenue: (a) => a.saasRevenue,
  gmv: (a) => a.gmv,
  activeCompanies: (a) => a.activeCompanies,
  activeCaterings: (a) => a.activeCaterings,
}

export const METRIC_LABEL: Record<MetricKey, string> = {
  totalRevenue: 'Ingresos totales',
  mrrSaas: 'MRR SaaS',
  commissionRevenue: 'Comisiones',
  saasRevenue: 'Ingresos SaaS',
  gmv: 'GMV (volumen)',
  activeCompanies: 'Empresas activas',
  activeCaterings: 'Caterings activos',
}

export function buildPlanVsReal(
  projection: MonthlyProjection[],
  actuals: ActualsSeriesPoint[],
  metric: MetricKey,
  thresholds: { warnPct: number; offPct: number } = { warnPct: 10, offPct: 25 }
): PlanVsRealRow[] {
  const actualByPeriod = new Map(actuals.map((a) => [a.period, a]))
  const getPlan = PLANNED[metric]
  const getActual = ACTUAL[metric]

  return projection.map((p) => {
    const planned = getPlan(p)
    const a = actualByPeriod.get(p.period)
    const actual = a ? getActual(a) : null

    if (actual == null) {
      return { period: p.period, metric, planned, actual: null, variance: null, variancePct: null, status: 'na' }
    }
    const variance = actual - planned
    const variancePct = planned !== 0 ? (variance / planned) * 100 : null
    const absPct = variancePct != null ? Math.abs(variancePct) : 0
    const status: PlanVsRealRow['status'] =
      variancePct == null ? 'na' : absPct <= thresholds.warnPct ? 'ok' : absPct <= thresholds.offPct ? 'warn' : 'off'

    return {
      period: p.period,
      metric,
      planned: Math.round(planned * 100) / 100,
      actual: Math.round(actual * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variancePct: variancePct != null ? Math.round(variancePct * 10) / 10 : null,
      status,
    }
  })
}
