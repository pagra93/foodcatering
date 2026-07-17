/**
 * Comparación de escenarios y análisis de sensibilidad (tornado). Puro.
 */

import type { Assumptions } from '@/lib/validations/finance'
import { projectMonthly } from './project'
import { summarizeModel } from './metrics'
import type { ModelSummary } from './types'

/** Resumen de un escenario (sin métricas, para comparativas). */
function summaryOf(a: Assumptions, startMonth: string, horizonMonths: number): ModelSummary {
  return summarizeModel(projectMonthly({ assumptions: a, startMonth, horizonMonths }))
}

export type ScenarioInput = {
  key: string
  name: string
  assumptions: Assumptions
  startMonth: string
  horizonMonths: number
}

export type ScenarioComparison = { key: string; name: string; summary: ModelSummary }

export function compareScenarios(list: ScenarioInput[]): ScenarioComparison[] {
  return list.map((s) => ({
    key: s.key,
    name: s.name,
    summary: summaryOf(s.assumptions, s.startMonth, s.horizonMonths),
  }))
}

/** Un driver que se puede sensibilizar (±%). */
type Driver = { key: string; label: string; get: (a: Assumptions) => number; set: (a: Assumptions, v: number) => void }

const DRIVERS: Driver[] = [
  { key: 'newCompanies', label: 'Nuevas empresas/mes', get: (a) => a.growth.newCompaniesPerMonth, set: (a, v) => { a.growth.newCompaniesPerMonth = v } },
  { key: 'churn', label: 'Churn empresas', get: (a) => a.growth.monthlyChurnRatePct, set: (a, v) => { a.growth.monthlyChurnRatePct = v } },
  { key: 'ticket', label: 'Ticket medio', get: (a) => a.growth.avgTicket, set: (a, v) => { a.growth.avgTicket = v } },
  { key: 'orders', label: 'Pedidos/empleado', get: (a) => a.growth.ordersPerEmployeePerMonth, set: (a, v) => { a.growth.ordersPerEmployeePerMonth = v } },
  { key: 'commission', label: 'Comisión media', get: (a) => a.pricing.avgCommissionPct, set: (a, v) => { a.pricing.avgCommissionPct = v } },
  { key: 'employees', label: 'Empleados/empresa', get: (a) => a.growth.employeesPerCompany, set: (a, v) => { a.growth.employeesPerCompany = v } },
  { key: 'priceGrowth', label: 'Precio Growth', get: (a) => a.pricing.planPrices.growth, set: (a, v) => { a.pricing.planPrices.growth = v } },
  { key: 'cac', label: 'CAC', get: (a) => a.costs.sAndM.cac, set: (a, v) => { a.costs.sAndM.cac = v } },
]

export type SensitivityBar = { driver: string; label: string; low: number; high: number; base: number }

/**
 * Tornado sobre el ARR final: por cada driver, ±deltaPct → ARR final resultante.
 * Ordenado por impacto (rango high-low) descendente.
 */
export function sensitivity(
  assumptions: Assumptions,
  startMonth: string,
  horizonMonths: number,
  deltaPct = 20
): { base: number; bars: SensitivityBar[] } {
  const baseArr = summaryOf(assumptions, startMonth, horizonMonths).endingArr
  const factorLow = 1 - deltaPct / 100
  const factorHigh = 1 + deltaPct / 100

  const bars = DRIVERS.map((d) => {
    const lowA = structuredClone(assumptions)
    d.set(lowA, d.get(lowA) * factorLow)
    const highA = structuredClone(assumptions)
    d.set(highA, d.get(highA) * factorHigh)
    const low = summaryOf(lowA, startMonth, horizonMonths).endingArr
    const high = summaryOf(highA, startMonth, horizonMonths).endingArr
    return { driver: d.key, label: d.label, low, high, base: baseArr }
  })

  bars.sort((a, b) => Math.abs(b.high - b.low) - Math.abs(a.high - a.low))
  return { base: baseArr, bars }
}
