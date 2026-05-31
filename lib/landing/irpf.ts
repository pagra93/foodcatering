/**
 * Lógica pura de la calculadora de ahorro IRPF (Art. 42.3 LIRPF).
 *
 * Referencia legal: Art. 42.3 LIRPF (Ley 35/2006) — las entregas en especie
 * de comida en el puesto de trabajo están exentas hasta 11€/día laborable y
 * empleado. Por encima del límite, el exceso sí tributa como rendimiento del
 * trabajo en especie.
 *
 * Este módulo calcula estimaciones orientativas. NO sustituye asesoramiento
 * fiscal profesional.
 */

export const IRPF_LIMIT_PER_DAY = 11
export const DEFAULT_MARGINAL_RATE = 0.3 // 30% — tipo medio IRPF España 2024 ~29.8%
export const EFFECTIVE_MONTHS_PER_YEAR = 11 // descontando 1 mes de vacaciones
export const CORPORATE_TAX_RATE = 0.25 // 25% — tipo general Impuesto sobre Sociedades

export type IrpfCalculatorInput = {
  employees: number
  daysUsedPerEmployee: number
  companyContributionPerDay: number
  employeeContributionPerDay: number
  marginalTaxRate: number // 0-1, decimal
}

export type IrpfCalculatorOutput = {
  /** Coste mensual medio para la empresa (€). */
  monthlyCompanyCost: number
  /** Coste anual para la empresa (11 meses) (€). */
  annualCompanyCost: number
  /** Base imponible anual que se ahorra el empleado (€). Limitada a 11€/día. */
  annualTaxableBaseSaving: number
  /** Ahorro fiscal anual total para los empleados (base × TMI) (€). */
  annualEmployeeTaxSaving: number
  /** Gasto medio mensual por empleado (€). */
  avgMonthlyPerEmployee: number
  /**
   * Número de céntimos de cada euro que invierte la empresa que llegan netos
   * al empleado, frente al equivalente en salario bruto gravado por IRPF.
   * Siempre 1 en el régimen del 42.3 (si no excede límite).
   */
  effectiveNetRatio: number
  /** True si la aportación empresa/día excede el límite 42.3. */
  exceedsIrpfLimit: boolean
  /** Exceso por día que SÍ tributa (€). */
  excessPerDay: number
  /** Coste mensual que aporta el conjunto de empleados (copago) (€). */
  monthlyEmployeeCost: number
  /** Deducción mensual estimada en el Impuesto sobre Sociedades (25%) (€). */
  monthlyCompanyTaxDeduction: number
  /** Coste neto mensual para la empresa tras la deducción IS (€). */
  monthlyCompanyNetCost: number
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min
  return Math.max(min, Math.min(max, n))
}

export function calculateIrpfSavings(
  input: IrpfCalculatorInput,
): IrpfCalculatorOutput {
  const employees = Math.max(0, Math.floor(input.employees))
  const daysUsedPerEmployee = Math.max(0, input.daysUsedPerEmployee)
  const companyContributionPerDay = Math.max(0, input.companyContributionPerDay)
  const employeeContributionPerDay = Math.max(
    0,
    input.employeeContributionPerDay,
  )
  const marginalTaxRate = clamp(input.marginalTaxRate, 0, 1)

  const deductiblePerDay = Math.min(
    companyContributionPerDay,
    IRPF_LIMIT_PER_DAY,
  )
  const excessPerDay = Math.max(
    0,
    companyContributionPerDay - IRPF_LIMIT_PER_DAY,
  )

  const monthlyCompanyCost =
    employees * daysUsedPerEmployee * companyContributionPerDay
  const annualCompanyCost = monthlyCompanyCost * EFFECTIVE_MONTHS_PER_YEAR

  const daysPerYear = daysUsedPerEmployee * EFFECTIVE_MONTHS_PER_YEAR
  const annualTaxableBaseSaving =
    deductiblePerDay * daysPerYear * employees
  const annualEmployeeTaxSaving = annualTaxableBaseSaving * marginalTaxRate

  const avgMonthlyPerEmployee =
    employees > 0 ? monthlyCompanyCost / employees : 0

  const monthlyEmployeeCost =
    employees * daysUsedPerEmployee * employeeContributionPerDay
  // El gasto en comida de empresa es deducible en el IS. Estimamos el ahorro
  // fiscal aplicando el tipo general (25%) al coste mensual de la empresa.
  const monthlyCompanyTaxDeduction = monthlyCompanyCost * CORPORATE_TAX_RATE
  const monthlyCompanyNetCost = monthlyCompanyCost - monthlyCompanyTaxDeduction

  return {
    monthlyCompanyCost,
    annualCompanyCost,
    annualTaxableBaseSaving,
    annualEmployeeTaxSaving,
    avgMonthlyPerEmployee,
    effectiveNetRatio: excessPerDay > 0 ? 1 - marginalTaxRate / 1 : 1,
    exceedsIrpfLimit: excessPerDay > 0,
    excessPerDay,
    monthlyEmployeeCost,
    monthlyCompanyTaxDeduction,
    monthlyCompanyNetCost,
  }
}

// ============================================================================
// URL param encoding — para compartir el resultado por URL
// ============================================================================

export function encodeCalculatorUrlParams(
  input: Partial<IrpfCalculatorInput>,
): URLSearchParams {
  const params = new URLSearchParams()
  if (input.employees != null)
    params.set('emp', String(Math.round(input.employees)))
  if (input.daysUsedPerEmployee != null)
    params.set('dias', String(input.daysUsedPerEmployee))
  if (input.companyContributionPerDay != null)
    params.set('copayE', String(input.companyContributionPerDay))
  if (input.employeeContributionPerDay != null)
    params.set('copayW', String(input.employeeContributionPerDay))
  if (input.marginalTaxRate != null)
    params.set('tmi', String(Math.round(input.marginalTaxRate * 100)))
  return params
}

export function decodeCalculatorUrlParams(
  params: URLSearchParams | ReadonlyURLSearchParams,
): Partial<IrpfCalculatorInput> {
  const out: Partial<IrpfCalculatorInput> = {}
  const emp = params.get('emp')
  if (emp != null) {
    const n = Number(emp)
    if (!Number.isNaN(n)) out.employees = n
  }
  const dias = params.get('dias')
  if (dias != null) {
    const n = Number(dias)
    if (!Number.isNaN(n)) out.daysUsedPerEmployee = n
  }
  const copayE = params.get('copayE')
  if (copayE != null) {
    const n = Number(copayE)
    if (!Number.isNaN(n)) out.companyContributionPerDay = n
  }
  const copayW = params.get('copayW')
  if (copayW != null) {
    const n = Number(copayW)
    if (!Number.isNaN(n)) out.employeeContributionPerDay = n
  }
  const tmi = params.get('tmi')
  if (tmi != null) {
    const n = Number(tmi)
    if (!Number.isNaN(n)) out.marginalTaxRate = n / 100
  }
  return out
}

// Tipo mínimo compatible con next/navigation ReadonlyURLSearchParams
type ReadonlyURLSearchParams = {
  get(name: string): string | null
}

export const DEFAULT_CALCULATOR_INPUT: IrpfCalculatorInput = {
  employees: 50,
  daysUsedPerEmployee: 16,
  companyContributionPerDay: 9,
  employeeContributionPerDay: 2,
  marginalTaxRate: DEFAULT_MARGINAL_RATE,
}
