/**
 * Proyección financiera mes a mes (P&L + caja). TS puro, sin Prisma → testeable.
 * Convención: campos "…Pct" son porcentaje (5 = 5%); importes en euros.
 */

import type { Assumptions } from '@/lib/validations/finance'
import type { MonthlyProjection } from './types'

/** Suma `n` meses a un período "YYYY-MM". */
export function addMonths(period: string, n: number): string {
  const [y = 0, m = 1] = period.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

const r2 = (x: number) => Math.round(x * 100) / 100

/**
 * Comisión efectiva de catering según el mix de planes: el % ponderado sobre TODO
 * el GMV (los caterings de cuota fija aportan 0% aquí) + el peso de la cuota fija.
 * Toma solo el bloque `pricing` para poder reutilizarlo sobre datos reales.
 */
export function blendedCateringPricing(
  pricing: Assumptions['pricing']
): { blendedCommissionPct: number; fixedShare: number } {
  const { cateringMix: mix, cateringCommission: comm } = pricing
  const total = mix.basico + mix.estandar + mix.premium + mix.fija
  if (total <= 0) return { blendedCommissionPct: 0, fixedShare: 0 }
  const blendedCommissionPct =
    (mix.basico * comm.basico + mix.estandar * comm.estandar + mix.premium * comm.premium) / total
  return { blendedCommissionPct, fixedShare: mix.fija / total }
}

/** Igual que `blendedCateringPricing` pero desde los supuestos completos. */
export function cateringPricing(a: Assumptions): { blendedCommissionPct: number; fixedShare: number } {
  return blendedCateringPricing(a.pricing)
}

/** Precio mensual medio por empresa según el mix de planes (pesos normalizados). */
export function weightedPlanPrice(a: Assumptions): number {
  const { planMix } = a.growth
  const { planPrices } = a.pricing
  const sum = planMix.starter + planMix.growth + planMix.enterprise
  if (sum <= 0) return 0
  return (
    (planMix.starter * planPrices.starter +
      planMix.growth * planPrices.growth +
      planMix.enterprise * planPrices.enterprise) /
    sum
  )
}

export type ProjectInput = {
  assumptions: Assumptions
  startMonth: string
  horizonMonths: number
  /** Ancla opcional del mes 0 a valores reales. */
  anchor?: { companies?: number; caterings?: number }
}

export function projectMonthly(input: ProjectInput): MonthlyProjection[] {
  const { assumptions: a, startMonth, horizonMonths, anchor } = input
  const g = a.growth
  const c = a.costs
  const arpu = weightedPlanPrice(a)
  const { blendedCommissionPct, fixedShare } = cateringPricing(a)

  const fundingByMonth = new Map<number, number>()
  for (const round of a.cash.fundingRounds) {
    fundingByMonth.set(round.monthIndex, (fundingByMonth.get(round.monthIndex) ?? 0) + round.amount)
  }

  const rows: MonthlyProjection[] = []
  let companies = anchor?.companies ?? g.startingCompanies
  let caterings = anchor?.caterings ?? g.startingCaterings
  let cashBalance = a.cash.startingCash

  for (let m = 0; m < horizonMonths; m++) {
    let newCompanies: number
    let churnedCompanies: number
    if (m === 0) {
      newCompanies = 0
      churnedCompanies = 0
    } else {
      churnedCompanies = companies * (g.monthlyChurnRatePct / 100)
      newCompanies =
        g.growthMode === 'percent' ? companies * (g.companyGrowthRatePct / 100) : g.newCompaniesPerMonth
      companies = Math.max(0, companies - churnedCompanies + newCompanies)
      const cateringChurn = caterings * (g.cateringChurnRatePct / 100)
      caterings = Math.max(0, caterings - cateringChurn + g.newCateringsPerMonth)
    }

    const employees = companies * g.employeesPerCompany
    // Volumen de menús: por empresas (empleados×pedidos) o directo (menús/día).
    const orders =
      g.volumeMode === 'byMenus'
        ? g.menusPerDay * g.workingDaysPerMonth * Math.pow(1 + g.menusGrowthRatePct / 100, m)
        : employees * g.ordersPerEmployeePerMonth
    const ordersPerDay = g.workingDaysPerMonth > 0 ? orders / g.workingDaysPerMonth : 0
    const gmv = orders * g.avgTicket

    const mrrSaas = companies * arpu
    // Comisión = % mezclado sobre el GMV + cuota fija de los caterings de ese plan.
    const commissionOnGmv = gmv * (blendedCommissionPct / 100)
    const fixedFeeRevenue = fixedShare * caterings * a.pricing.cateringFixedFee
    const commissionRevenue = commissionOnGmv + fixedFeeRevenue
    const totalRevenue = mrrSaas + commissionRevenue

    const cogs =
      c.cogs.hostingPerCompany * companies +
      c.cogs.supportPerCompany * companies +
      gmv * (c.cogs.paymentProcessingPct / 100)
    const grossProfit = totalRevenue - cogs
    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

    const sAndM = c.sAndM.marketingMonthlyBudget + c.sAndM.cac * newCompanies
    const rAndD = c.rAndD.engineers * c.rAndD.avgSalaryPerMonth
    const gAndA =
      c.gAndA.salariesPerMonth + c.gAndA.rentPerMonth + c.gAndA.toolsPerMonth + c.gAndA.legalPerMonth
    const totalOpex = sAndM + rAndD + gAndA
    const ebitda = grossProfit - totalOpex

    const funding = fundingByMonth.get(m) ?? 0
    const cashFlow = ebitda + funding
    cashBalance += cashFlow

    const burn = cashFlow < 0 ? -cashFlow : 0
    const runwayMonths = burn > 0 ? cashBalance / burn : null

    rows.push({
      monthIndex: m,
      period: addMonths(startMonth, m),
      activeCompanies: r2(companies),
      newCompanies: r2(newCompanies),
      churnedCompanies: r2(churnedCompanies),
      activeCaterings: r2(caterings),
      employees: r2(employees),
      orders: r2(orders),
      ordersPerDay: r2(ordersPerDay),
      gmv: r2(gmv),
      mrrSaas: r2(mrrSaas),
      commissionRevenue: r2(commissionRevenue),
      totalRevenue: r2(totalRevenue),
      cogs: r2(cogs),
      grossProfit: r2(grossProfit),
      grossMarginPct: r2(grossMarginPct),
      sAndM: r2(sAndM),
      rAndD: r2(rAndD),
      gAndA: r2(gAndA),
      totalOpex: r2(totalOpex),
      ebitda: r2(ebitda),
      funding: r2(funding),
      cashFlow: r2(cashFlow),
      cashBalance: r2(cashBalance),
      runwayMonths: runwayMonths != null ? Math.round(runwayMonths * 10) / 10 : null,
    })
  }

  return rows
}
