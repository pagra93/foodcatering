/**
 * Calculadora "¿y si?" de comisiones sobre datos REALES (retroactivo). Puro.
 *
 * Toma el GMV y la comisión realmente facturada mes a mes y les aplica una
 * estructura de comisión hipotética (comisión por plan + reparto + cuota fija)
 * para ver el € exacto de más/menos que se habría ganado. No es proyección: es
 * "sobre lo que YA facturaste, ¿cuánto cambiaría con estas comisiones?".
 */

import type { Assumptions } from '@/lib/validations/finance'
import type { ActualsSeriesPoint } from './types'
import { blendedCateringPricing } from './project'

const r2 = (x: number) => Math.round(x * 100) / 100

export type WhatIfRow = {
  period: string
  gmv: number
  activeCaterings: number | null
  realCommission: number
  hypotheticalCommission: number
  delta: number
}

export type WhatIfResult = {
  rows: WhatIfRow[]
  /** % de comisión mezclado que resulta del mix hipotético. */
  blendedCommissionPct: number
  /** Peso de los caterings de cuota fija (0–1). */
  fixedShare: number
  /** % efectivo REAL = comisión real / GMV real (agregado del periodo). */
  realEffectivePct: number
  totals: {
    months: number
    gmv: number
    realCommission: number
    hypotheticalCommission: number
    delta: number
  }
  /** Delta extrapolado a 12 meses (media mensual × 12). */
  annualizedDelta: number
}

/**
 * Aplica una estructura de comisión hipotética al histórico real.
 * @param actuals serie real (gmv, comisión facturada, caterings activos por mes)
 * @param pricing bloque de pricing con la comisión hipotética a probar
 */
export function whatIfCommission(actuals: ActualsSeriesPoint[], pricing: Assumptions['pricing']): WhatIfResult {
  const { blendedCommissionPct, fixedShare } = blendedCateringPricing(pricing)

  const rows: WhatIfRow[] = actuals.map((pt) => {
    const caterings = pt.activeCaterings ?? 0
    const hypoOnGmv = pt.gmv * (blendedCommissionPct / 100)
    const hypoFixed = fixedShare * caterings * pricing.cateringFixedFee
    const hypothetical = hypoOnGmv + hypoFixed
    return {
      period: pt.period,
      gmv: r2(pt.gmv),
      activeCaterings: pt.activeCaterings,
      realCommission: r2(pt.commissionRevenue),
      hypotheticalCommission: r2(hypothetical),
      delta: r2(hypothetical - pt.commissionRevenue),
    }
  })

  const gmv = rows.reduce((s, r) => s + r.gmv, 0)
  const realCommission = rows.reduce((s, r) => s + r.realCommission, 0)
  const hypotheticalCommission = rows.reduce((s, r) => s + r.hypotheticalCommission, 0)
  const delta = hypotheticalCommission - realCommission
  const months = rows.length

  return {
    rows,
    blendedCommissionPct,
    fixedShare,
    realEffectivePct: gmv > 0 ? (realCommission / gmv) * 100 : 0,
    totals: {
      months,
      gmv: r2(gmv),
      realCommission: r2(realCommission),
      hypotheticalCommission: r2(hypotheticalCommission),
      delta: r2(delta),
    },
    annualizedDelta: months > 0 ? r2((delta / months) * 12) : 0,
  }
}
