/**
 * Validación (Zod) del modelo financiero / business plan.
 * `assumptionsSchema` es la fuente del tipo `Assumptions` (z.infer). Convención:
 * los campos "…Pct" son PORCENTAJE (5 = 5%); el motor divide por 100. Los
 * importes están en euros. `planMix` son pesos (el motor los normaliza).
 */

import { z } from 'zod'

const nonNeg = z.number().min(0)
const pct = z.number().min(0).max(100)

export const planMixSchema = z.object({
  starter: nonNeg,
  growth: nonNeg,
  enterprise: nonNeg,
})

export const planPricesSchema = z.object({
  starter: nonNeg,
  growth: nonNeg,
  enterprise: nonNeg,
})

export const assumptionsSchema = z.object({
  growth: z.object({
    startingCompanies: nonNeg,
    startingCaterings: nonNeg,
    growthMode: z.enum(['absolute', 'percent']).default('absolute'),
    newCompaniesPerMonth: nonNeg, // modo 'absolute'
    companyGrowthRatePct: pct, // modo 'percent' (MoM)
    monthlyChurnRatePct: pct, // churn de empresas (MoM)
    newCateringsPerMonth: nonNeg,
    cateringChurnRatePct: pct,
    planMix: planMixSchema, // pesos, se normalizan
    employeesPerCompany: nonNeg,
    ordersPerEmployeePerMonth: nonNeg,
    avgTicket: nonNeg, // € por pedido (unidad de GMV)
  }),
  pricing: z.object({
    planPrices: planPricesSchema, // €/mes por plan de empresa
    avgCommissionPct: pct, // % sobre el GMV catering
  }),
  costs: z.object({
    cogs: z.object({
      hostingPerCompany: nonNeg, // €/empresa/mes
      paymentProcessingPct: pct, // % sobre GMV
      supportPerCompany: nonNeg, // €/empresa/mes
    }),
    sAndM: z.object({
      cac: nonNeg, // € por empresa nueva
      marketingMonthlyBudget: nonNeg,
    }),
    rAndD: z.object({
      engineers: nonNeg,
      avgSalaryPerMonth: nonNeg, // € por ingeniero/mes
    }),
    gAndA: z.object({
      salariesPerMonth: nonNeg,
      rentPerMonth: nonNeg,
      toolsPerMonth: nonNeg,
      legalPerMonth: nonNeg,
    }),
  }),
  cash: z.object({
    startingCash: z.number(), // puede ser 0
    fundingRounds: z
      .array(z.object({ monthIndex: z.number().int().min(0), amount: nonNeg }))
      .default([]),
  }),
})

export type Assumptions = z.infer<typeof assumptionsSchema>

const monthRegex = /^\d{4}-\d{2}$/

export const saveScenarioSchema = z.object({
  key: z.string().min(2).max(60),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  kind: z.enum(['BASE', 'OPTIMISTIC', 'PESSIMISTIC', 'CUSTOM']).default('CUSTOM'),
  startMonth: z.string().regex(monthRegex, 'Formato YYYY-MM'),
  horizonMonths: z.number().int().min(12).max(60),
  assumptions: assumptionsSchema,
})

export type SaveScenarioInput = z.infer<typeof saveScenarioSchema>

const money = z.number().min(0).nullable().optional()

export const actualsSchema = z.object({
  period: z.string().regex(monthRegex, 'Formato YYYY-MM'),
  cogsHosting: money,
  cogsPayments: money,
  cogsSupport: money,
  opexSales: money,
  opexRnd: money,
  opexGna: money,
  headcount: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(1000).optional(),
})

export type ActualsInput = z.infer<typeof actualsSchema>
