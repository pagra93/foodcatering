import { describe, it, expect } from 'vitest'
import { buildPlanVsReal } from '@/lib/finance/plan-vs-real'
import type { MonthlyProjection, ActualsSeriesPoint } from '@/lib/finance/types'

const proj = (period: string, totalRevenue: number): MonthlyProjection =>
  ({ period, totalRevenue } as MonthlyProjection)

const actual = (period: string, totalRevenue: number | null): ActualsSeriesPoint =>
  ({
    period,
    totalRevenue: totalRevenue ?? 0,
    commissionRevenue: 0,
    saasRevenue: 0,
    gmv: 0,
    mrrSaas: null,
    activeCompanies: null,
    activeCaterings: null,
    newCompanies: 0,
    churnedCompanies: 0,
    cogs: null,
    totalOpex: null,
    ebitda: null,
  })

describe('buildPlanVsReal', () => {
  it("marca 'na' cuando no hay real ese mes", () => {
    const rows = buildPlanVsReal([proj('2026-01', 1000)], [], 'totalRevenue')
    expect(rows[0]!.status).toBe('na')
    expect(rows[0]!.actual).toBeNull()
  })

  it('semáforo ok / warn / off por umbral de varianza', () => {
    const projection = [proj('2026-01', 1000), proj('2026-02', 1000), proj('2026-03', 1000)]
    const actuals = [
      actual('2026-01', 1050), // +5% → ok
      actual('2026-02', 1200), // +20% → warn
      actual('2026-03', 1400), // +40% → off
    ]
    const rows = buildPlanVsReal(projection, actuals, 'totalRevenue')
    expect(rows[0]!.status).toBe('ok')
    expect(rows[1]!.status).toBe('warn')
    expect(rows[2]!.status).toBe('off')
    expect(rows[0]!.variancePct).toBeCloseTo(5, 1)
    expect(rows[2]!.variance).toBe(400)
  })
})
