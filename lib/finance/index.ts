/**
 * Motor financiero — barrel + orquestador. Todo derivado se recomputa aquí
 * desde (supuestos, datos reales). Nada se persiste.
 */

import type { Assumptions } from '@/lib/validations/finance'
import { projectMonthly, type ProjectInput } from './project'
import { computeMetrics, summarizeModel } from './metrics'
import type { MonthlyProjection, SaasMetricsPoint, ModelSummary } from './types'

export * from './types'
export { projectMonthly, addMonths, weightedPlanPrice } from './project'
export { computeMetrics, summarizeModel } from './metrics'
export { DEFAULT_ASSUMPTIONS, optimisticAssumptions, pessimisticAssumptions } from './defaults'

export type RunModelResult = {
  projection: MonthlyProjection[]
  metrics: SaasMetricsPoint[]
  summary: ModelSummary
}

/** Corre el modelo completo desde unos supuestos. */
export function runModel(
  assumptions: Assumptions,
  startMonth: string,
  horizonMonths: number,
  anchor?: ProjectInput['anchor']
): RunModelResult {
  const projection = projectMonthly({ assumptions, startMonth, horizonMonths, anchor })
  const metrics = computeMetrics(projection, assumptions)
  const summary = summarizeModel(projection)
  return { projection, metrics, summary }
}
