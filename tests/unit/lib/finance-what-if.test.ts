import { describe, it, expect } from 'vitest'
import { whatIfCommission } from '@/lib/finance'
import type { ActualsSeriesPoint } from '@/lib/finance/types'

/** Punto real mínimo (solo los campos que usa el what-if). */
function pt(period: string, gmv: number, commission: number, caterings: number | null): ActualsSeriesPoint {
  return {
    period,
    totalRevenue: commission,
    commissionRevenue: commission,
    saasRevenue: 0,
    gmv,
    mrrSaas: null,
    activeCompanies: null,
    activeCaterings: caterings,
    newCompanies: 0,
    churnedCompanies: 0,
    cogs: null,
    totalOpex: null,
    ebitda: null,
  }
}

describe('whatIfCommission', () => {
  it('aplica el % mezclado al GMV real y calcula el delta vs lo facturado', () => {
    // Sin cuota fija: 100% del reparto al plan estándar (5%).
    const pricing = {
      planPrices: { starter: 49, growth: 149, enterprise: 499 },
      cateringCommission: { basico: 8, estandar: 5, premium: 3 },
      cateringFixedFee: 299,
      cateringMix: { basico: 0, estandar: 100, premium: 0, fija: 0 },
    }
    // Facturado el 4% real; probamos el 5% → +1% del GMV.
    const actuals = [pt('2026-01', 10000, 400, 3), pt('2026-02', 20000, 800, 3)]
    const res = whatIfCommission(actuals, pricing)

    expect(res.blendedCommissionPct).toBeCloseTo(5, 4)
    expect(res.fixedShare).toBe(0)
    expect(res.rows[0]!.hypotheticalCommission).toBeCloseTo(500, 2) // 10000 * 5%
    expect(res.rows[0]!.delta).toBeCloseTo(100, 2) // 500 - 400
    expect(res.totals.hypotheticalCommission).toBeCloseTo(1500, 2) // 500 + 1000
    expect(res.totals.delta).toBeCloseTo(300, 2) // 1500 - 1200
    expect(res.realEffectivePct).toBeCloseTo(4, 4) // 1200 / 30000
  })

  it('la cuota fija aporta €/mes por catering según su peso en el reparto', () => {
    const pricing = {
      planPrices: { starter: 49, growth: 149, enterprise: 499 },
      cateringCommission: { basico: 8, estandar: 5, premium: 3 },
      cateringFixedFee: 300,
      // 50% comisión estándar (5%), 50% cuota fija.
      cateringMix: { basico: 0, estandar: 50, premium: 0, fija: 50 },
    }
    const res = whatIfCommission([pt('2026-01', 10000, 0, 4)], pricing)
    // blended = (50*5)/100 = 2.5% ; fixedShare = 0.5
    expect(res.blendedCommissionPct).toBeCloseTo(2.5, 4)
    // hipot = 10000*2.5% + 0.5*4*300 = 250 + 600 = 850
    expect(res.rows[0]!.hypotheticalCommission).toBeCloseTo(850, 2)
  })

  it('anualiza el delta por la media mensual', () => {
    const pricing = {
      planPrices: { starter: 49, growth: 149, enterprise: 499 },
      cateringCommission: { basico: 8, estandar: 5, premium: 3 },
      cateringFixedFee: 299,
      cateringMix: { basico: 0, estandar: 100, premium: 0, fija: 0 },
    }
    // 3 meses, +100 de delta cada uno → media 100/mes → anualizado 1200.
    const actuals = [pt('2026-01', 10000, 400, 3), pt('2026-02', 10000, 400, 3), pt('2026-03', 10000, 400, 3)]
    const res = whatIfCommission(actuals, pricing)
    expect(res.totals.delta).toBeCloseTo(300, 2)
    expect(res.annualizedDelta).toBeCloseTo(1200, 2)
  })

  it('serie real vacía → totales a cero sin dividir por cero', () => {
    const pricing = {
      planPrices: { starter: 49, growth: 149, enterprise: 499 },
      cateringCommission: { basico: 8, estandar: 5, premium: 3 },
      cateringFixedFee: 299,
      cateringMix: { basico: 20, estandar: 50, premium: 20, fija: 10 },
    }
    const res = whatIfCommission([], pricing)
    expect(res.totals.months).toBe(0)
    expect(res.totals.delta).toBe(0)
    expect(res.realEffectivePct).toBe(0)
    expect(res.annualizedDelta).toBe(0)
  })
})
