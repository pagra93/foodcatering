import { describe, it, expect } from 'vitest'
import { projectMonthly, addMonths, weightedPlanPrice, runModel } from '@/lib/finance'
import { DEFAULT_ASSUMPTIONS } from '@/lib/finance/defaults'
import type { Assumptions } from '@/lib/validations/finance'
import type { MonthlyProjection } from '@/lib/finance/types'

const base: Assumptions = DEFAULT_ASSUMPTIONS
const at = (rows: MonthlyProjection[], i: number): MonthlyProjection => {
  const r = rows[i]
  if (!r) throw new Error(`no hay fila ${i}`)
  return r
}

describe('addMonths', () => {
  it('suma meses cruzando año', () => {
    expect(addMonths('2026-01', 0)).toBe('2026-01')
    expect(addMonths('2026-01', 1)).toBe('2026-02')
    expect(addMonths('2026-11', 2)).toBe('2027-01')
    expect(addMonths('2026-12', 12)).toBe('2027-12')
  })
})

describe('weightedPlanPrice', () => {
  it('pondera por el mix normalizado', () => {
    // mix 60/30/10 sobre 49/149/499 = 0.6*49 + 0.3*149 + 0.1*499 = 124.0
    expect(weightedPlanPrice(base)).toBeCloseTo(124.0, 2)
  })
  it('mix a cero → precio 0 (sin dividir por cero)', () => {
    const a = structuredClone(base)
    a.growth.planMix = { starter: 0, growth: 0, enterprise: 0 }
    expect(weightedPlanPrice(a)).toBe(0)
  })
})

describe('projectMonthly', () => {
  it('produce una fila por mes del horizonte', () => {
    const rows = projectMonthly({ assumptions: base, startMonth: '2026-01', horizonMonths: 36 })
    expect(rows).toHaveLength(36)
    expect(at(rows, 0).period).toBe('2026-01')
    expect(at(rows, 35).period).toBe('2028-12')
  })

  it('mes 0 sin altas ni churn; parte de startingCompanies', () => {
    const rows = projectMonthly({ assumptions: base, startMonth: '2026-01', horizonMonths: 12 })
    expect(at(rows, 0).activeCompanies).toBe(base.growth.startingCompanies)
    expect(at(rows, 0).newCompanies).toBe(0)
    expect(at(rows, 0).churnedCompanies).toBe(0)
  })

  it('el modo absoluto suma newCompaniesPerMonth menos churn', () => {
    const a = structuredClone(base)
    a.growth.startingCompanies = 10
    a.growth.newCompaniesPerMonth = 2
    a.growth.monthlyChurnRatePct = 10 // 10% de 10 = 1
    const rows = projectMonthly({ assumptions: a, startMonth: '2026-01', horizonMonths: 2 })
    // mes 1: 10 - 1 + 2 = 11
    expect(at(rows, 1).activeCompanies).toBeCloseTo(11, 2)
    expect(at(rows, 1).churnedCompanies).toBeCloseTo(1, 2)
    expect(at(rows, 1).newCompanies).toBeCloseTo(2, 2)
  })

  it('ingreso total = MRR SaaS + comisión sobre GMV', () => {
    const rows = projectMonthly({ assumptions: base, startMonth: '2026-01', horizonMonths: 1 })
    const p = at(rows, 0)
    expect(p.totalRevenue).toBeCloseTo(p.mrrSaas + p.commissionRevenue, 2)
    // MRR mes 0 = 5 empresas × 124 = 620
    expect(p.mrrSaas).toBeCloseTo(620, 2)
  })

  it('ancla el mes 0 a valores reales si se pasa anchor', () => {
    const rows = projectMonthly({
      assumptions: base,
      startMonth: '2026-01',
      horizonMonths: 3,
      anchor: { companies: 42, caterings: 7 },
    })
    expect(at(rows, 0).activeCompanies).toBe(42)
    expect(at(rows, 0).activeCaterings).toBe(7)
  })

  it('la caja arranca en startingCash y acumula el cashflow', () => {
    const a = structuredClone(base)
    a.cash.startingCash = 100000
    const rows = projectMonthly({ assumptions: a, startMonth: '2026-01', horizonMonths: 3 })
    expect(at(rows, 0).cashBalance).toBeCloseTo(100000 + at(rows, 0).cashFlow, 2)
    expect(at(rows, 1).cashBalance).toBeCloseTo(at(rows, 0).cashBalance + at(rows, 1).cashFlow, 2)
  })

  it('inyecta rondas de financiación en su mes', () => {
    const a = structuredClone(base)
    a.cash.fundingRounds = [{ monthIndex: 6, amount: 500000 }]
    const rows = projectMonthly({ assumptions: a, startMonth: '2026-01', horizonMonths: 8 })
    expect(at(rows, 6).funding).toBe(500000)
    expect(at(rows, 5).funding).toBe(0)
  })
})

describe('runModel (summary + metrics)', () => {
  it('devuelve proyección, métricas y resumen coherentes', () => {
    const { projection, metrics, summary } = runModel(base, '2026-01', 36)
    expect(projection).toHaveLength(36)
    expect(metrics).toHaveLength(36)
    expect(summary.startingMrr).toBeCloseTo(620, 2)
    expect(summary.endingMrr).toBe(at(projection, 35).mrrSaas)
    expect(summary.endingArr).toBeCloseTo(at(projection, 35).mrrSaas * 12, 2)
  })

  it('unit economics: ARPA > 0 y churn > 0 por defecto', () => {
    const { metrics } = runModel(base, '2026-01', 12)
    const m1 = metrics[1]
    if (!m1) throw new Error('sin métricas')
    expect(m1.arpa).toBeGreaterThan(0)
    expect(m1.churnPct).toBeGreaterThan(0)
  })
})
