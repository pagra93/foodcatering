import { describe, it, expect } from 'vitest'
import { compareScenarios, sensitivity } from '@/lib/finance/scenarios'
import { DEFAULT_ASSUMPTIONS, optimisticAssumptions, pessimisticAssumptions } from '@/lib/finance/defaults'

const base = { key: 'base', name: 'Base', assumptions: DEFAULT_ASSUMPTIONS, startMonth: '2026-01', horizonMonths: 36 }
const opt = { key: 'opt', name: 'Opt', assumptions: optimisticAssumptions(), startMonth: '2026-01', horizonMonths: 36 }
const pes = { key: 'pes', name: 'Pes', assumptions: pessimisticAssumptions(), startMonth: '2026-01', horizonMonths: 36 }

describe('compareScenarios', () => {
  it('el optimista termina con más ARR que el base, y el base más que el pesimista', () => {
    const res = compareScenarios([base, opt, pes])
    const byKey = Object.fromEntries(res.map((r) => [r.key, r.summary.endingArr]))
    expect(byKey['opt']!).toBeGreaterThan(byKey['base']!)
    expect(byKey['base']!).toBeGreaterThan(byKey['pes']!)
  })
})

describe('sensitivity', () => {
  it('devuelve una barra por driver, ordenada por impacto', () => {
    const { bars } = sensitivity(DEFAULT_ASSUMPTIONS, '2026-01', 36, 20)
    expect(bars.length).toBeGreaterThan(3)
    for (let i = 1; i < bars.length; i++) {
      const prev = Math.abs(bars[i - 1]!.high - bars[i - 1]!.low)
      const cur = Math.abs(bars[i]!.high - bars[i]!.low)
      expect(prev).toBeGreaterThanOrEqual(cur)
    }
  })

  it('subir el churn reduce el ARR (low > high para churn)', () => {
    const { bars } = sensitivity(DEFAULT_ASSUMPTIONS, '2026-01', 36, 20)
    const churn = bars.find((b) => b.driver === 'churn')!
    // +20% churn (high) → menos ARR; -20% churn (low) → más ARR
    expect(churn.low).toBeGreaterThan(churn.high)
  })
})
