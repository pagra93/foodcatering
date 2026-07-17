/**
 * Métricas SaaS y unit economics derivadas de la proyección. TS puro.
 * (a16z SaaS metrics, LTV/CAC, CAC payback, Rule of 40, burn multiple, NRR).
 */

import type { Assumptions } from '@/lib/validations/finance'
import type { MonthlyProjection, SaasMetricsPoint, ModelSummary } from './types'

const r2 = (x: number) => Math.round(x * 100) / 100
const pctOr = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0)

export function computeMetrics(
  projection: MonthlyProjection[],
  a: Assumptions
): SaasMetricsPoint[] {
  const cac = a.costs.sAndM.cac

  return projection.map((p, i) => {
    const prev = i > 0 ? projection[i - 1] : null
    const prev12 = i >= 12 ? projection[i - 12] : null

    const mrr = p.mrrSaas
    const arr = mrr * 12
    const momGrowthPct = prev && prev.mrrSaas > 0 ? pctOr(mrr - prev.mrrSaas, prev.mrrSaas) : 0
    const yoyGrowthPct =
      prev12 && prev12.mrrSaas > 0 ? pctOr(mrr - prev12.mrrSaas, prev12.mrrSaas) : null

    // Churn efectivo del mes (empresas perdidas / base del mes anterior).
    const churnPct = prev && prev.activeCompanies > 0 ? pctOr(p.churnedCompanies, prev.activeCompanies) : 0
    const nrrPct = 100 - churnPct // sin expansión modelada: NRR ≈ 1 − churn

    const arpa = p.activeCompanies > 0 ? mrr / p.activeCompanies : 0
    const gmFrac = p.grossMarginPct / 100
    // LTV = ARPA × margen bruto / churn mensual. Sin churn → null (vida infinita).
    const ltv = churnPct > 0 ? (arpa * gmFrac) / (churnPct / 100) : 0
    const ltvToCac = cac > 0 && ltv > 0 ? ltv / cac : null
    const grossPerCustomer = arpa * gmFrac
    const cacPaybackMonths = grossPerCustomer > 0 ? cac / grossPerCustomer : null

    const ebitdaMarginPct = pctOr(p.ebitda, p.totalRevenue)
    const growthForRule = yoyGrowthPct ?? momGrowthPct * 12
    const ruleOf40 = growthForRule + ebitdaMarginPct

    // Burn multiple = net burn / net new ARR.
    const netBurn = p.cashFlow < 0 ? -p.cashFlow : 0
    const netNewArr = prev ? arr - prev.mrrSaas * 12 : arr
    const burnMultiple = netNewArr > 0 && netBurn > 0 ? netBurn / netNewArr : null

    return {
      period: p.period,
      mrr: r2(mrr),
      arr: r2(arr),
      momGrowthPct: r2(momGrowthPct),
      yoyGrowthPct: yoyGrowthPct != null ? r2(yoyGrowthPct) : null,
      churnPct: r2(churnPct),
      nrrPct: r2(nrrPct),
      arpa: r2(arpa),
      cac: r2(cac),
      ltv: r2(ltv),
      ltvToCac: ltvToCac != null ? Math.round(ltvToCac * 10) / 10 : null,
      cacPaybackMonths: cacPaybackMonths != null ? Math.round(cacPaybackMonths * 10) / 10 : null,
      grossMarginPct: r2(p.grossMarginPct),
      ruleOf40: r2(ruleOf40),
      burnMultiple: burnMultiple != null ? Math.round(burnMultiple * 100) / 100 : null,
    }
  })
}

export function summarizeModel(projection: MonthlyProjection[]): ModelSummary {
  if (projection.length === 0) {
    return {
      startingMrr: 0,
      endingMrr: 0,
      endingArr: 0,
      breakEvenMonth: null,
      runwayMonths: null,
      minCashBalance: 0,
      minCashMonth: null,
      peakMonthlyBurn: 0,
      cumulativeBurn: 0,
      totalRevenue: 0,
    }
  }
  const first = projection[0]!
  const last = projection[projection.length - 1]!
  const breakEven = projection.find((p) => p.ebitda >= 0) ?? null

  let minCash = first.cashBalance
  let minCashMonth = first.period
  let peakBurn = 0
  let cumBurn = 0
  let totalRevenue = 0
  for (const p of projection) {
    if (p.cashBalance < minCash) {
      minCash = p.cashBalance
      minCashMonth = p.period
    }
    const burn = p.cashFlow < 0 ? -p.cashFlow : 0
    if (burn > peakBurn) peakBurn = burn
    cumBurn += burn
    totalRevenue += p.totalRevenue
  }

  return {
    startingMrr: r2(first.mrrSaas),
    endingMrr: r2(last.mrrSaas),
    endingArr: r2(last.mrrSaas * 12),
    breakEvenMonth: breakEven ? breakEven.period : null,
    runwayMonths: last.runwayMonths,
    minCashBalance: r2(minCash),
    minCashMonth,
    peakMonthlyBurn: r2(peakBurn),
    cumulativeBurn: r2(cumBurn),
    totalRevenue: r2(totalRevenue),
  }
}
