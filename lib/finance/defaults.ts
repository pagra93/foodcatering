/**
 * Supuestos por defecto del modelo financiero. Anclados a los planes reales
 * (starter 49€ / growth 149€ / enterprise 499€, comisión media 5%) y a costes
 * de una startup SaaS temprana. Editables desde la UI.
 */

import type { Assumptions } from '@/lib/validations/finance'

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  growth: {
    startingCompanies: 5,
    startingCaterings: 3,
    growthMode: 'absolute',
    newCompaniesPerMonth: 3,
    companyGrowthRatePct: 12,
    monthlyChurnRatePct: 2,
    newCateringsPerMonth: 1,
    cateringChurnRatePct: 1,
    planMix: { starter: 60, growth: 30, enterprise: 10 },
    employeesPerCompany: 40,
    ordersPerEmployeePerMonth: 18,
    avgTicket: 9,
  },
  pricing: {
    planPrices: { starter: 49, growth: 149, enterprise: 499 },
    avgCommissionPct: 5,
  },
  costs: {
    cogs: {
      hostingPerCompany: 4,
      paymentProcessingPct: 1.4,
      supportPerCompany: 6,
    },
    sAndM: {
      cac: 600,
      marketingMonthlyBudget: 2000,
    },
    rAndD: {
      engineers: 2,
      avgSalaryPerMonth: 4000,
    },
    gAndA: {
      salariesPerMonth: 4000,
      rentPerMonth: 800,
      toolsPerMonth: 500,
      legalPerMonth: 400,
    },
  },
  cash: {
    startingCash: 150000,
    fundingRounds: [],
  },
}

/** Variantes optimista / pesimista para los escenarios de sistema. */
export function optimisticAssumptions(): Assumptions {
  const a = structuredClone(DEFAULT_ASSUMPTIONS)
  a.growth.newCompaniesPerMonth = 5
  a.growth.companyGrowthRatePct = 18
  a.growth.monthlyChurnRatePct = 1
  a.growth.newCateringsPerMonth = 2
  a.pricing.avgCommissionPct = 5
  a.costs.sAndM.cac = 450
  return a
}

export function pessimisticAssumptions(): Assumptions {
  const a = structuredClone(DEFAULT_ASSUMPTIONS)
  a.growth.newCompaniesPerMonth = 1.5
  a.growth.companyGrowthRatePct = 6
  a.growth.monthlyChurnRatePct = 4
  a.growth.newCateringsPerMonth = 0.5
  a.costs.sAndM.cac = 800
  a.costs.sAndM.marketingMonthlyBudget = 1500
  return a
}
