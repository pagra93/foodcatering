/**
 * Tipos de salida del motor financiero (lib/finance/*). Todo derivado — no se
 * persiste. Importes en euros; mes como "YYYY-MM".
 */

/** Fila del P&L proyectado, un mes. */
export type MonthlyProjection = {
  monthIndex: number
  period: string
  // Crecimiento
  activeCompanies: number
  newCompanies: number
  churnedCompanies: number
  activeCaterings: number
  employees: number
  orders: number
  gmv: number
  // Ingresos de Plati
  mrrSaas: number
  commissionRevenue: number
  totalRevenue: number
  // Coste y margen
  cogs: number
  grossProfit: number
  grossMarginPct: number
  // OpEx
  sAndM: number
  rAndD: number
  gAndA: number
  totalOpex: number
  ebitda: number
  // Caja
  funding: number
  cashFlow: number
  cashBalance: number
  runwayMonths: number | null
}

/** Métricas SaaS / unit economics, un mes. */
export type SaasMetricsPoint = {
  period: string
  mrr: number
  arr: number
  momGrowthPct: number
  yoyGrowthPct: number | null
  churnPct: number
  nrrPct: number
  arpa: number
  cac: number
  ltv: number
  ltvToCac: number | null
  cacPaybackMonths: number | null
  grossMarginPct: number
  ruleOf40: number
  burnMultiple: number | null
}

/** Resumen del modelo (cabecera de KPIs). */
export type ModelSummary = {
  startingMrr: number
  endingMrr: number
  endingArr: number
  breakEvenMonth: string | null
  runwayMonths: number | null
  minCashBalance: number
  minCashMonth: string | null
  peakMonthlyBurn: number
  cumulativeBurn: number
  totalRevenue: number
}

/** Métricas que se pueden cruzar plan vs real (tienen serie real). */
export type MetricKey =
  | 'totalRevenue'
  | 'mrrSaas'
  | 'commissionRevenue'
  | 'saasRevenue'
  | 'gmv'
  | 'activeCompanies'
  | 'activeCaterings'

/** Serie real fusionada de las queries de la plataforma, un mes. */
export type ActualsSeriesPoint = {
  period: string
  totalRevenue: number
  commissionRevenue: number
  saasRevenue: number
  gmv: number
  mrrSaas: number | null
  activeCompanies: number | null
  activeCaterings: number | null
  newCompanies: number
  churnedCompanies: number
  // Coste real del mes (introducido a mano); null si no hay
  cogs: number | null
  totalOpex: number | null
  ebitda: number | null
}

/** Fila de la comparativa plan vs real. */
export type PlanVsRealRow = {
  period: string
  metric: MetricKey
  planned: number
  actual: number | null
  variance: number | null
  variancePct: number | null
  status: 'ok' | 'warn' | 'off' | 'na'
}
