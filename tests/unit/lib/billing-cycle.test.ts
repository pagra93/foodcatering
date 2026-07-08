import { describe, it, expect } from 'vitest'
import { isAnnualBillingDue, periodMonthIndex } from '@/lib/billing/cycle'

describe('periodMonthIndex', () => {
  it('devuelve el mes 0-based de "YYYY-MM"', () => {
    expect(periodMonthIndex('2026-01')).toBe(0)
    expect(periodMonthIndex('2026-03')).toBe(2)
    expect(periodMonthIndex('2026-12')).toBe(11)
  })
})

describe('isAnnualBillingDue', () => {
  it('true cuando el mes del periodo coincide con el mes de alta (UTC)', () => {
    const alta = new Date('2026-03-15T10:00:00.000Z') // marzo
    expect(isAnnualBillingDue('2026-03', alta)).toBe(true)
    expect(isAnnualBillingDue('2027-03', alta)).toBe(true) // aniversario siguiente
  })

  it('false en meses distintos al de aniversario', () => {
    const alta = new Date('2026-03-15T10:00:00.000Z')
    expect(isAnnualBillingDue('2026-01', alta)).toBe(false)
    expect(isAnnualBillingDue('2026-04', alta)).toBe(false)
    expect(isAnnualBillingDue('2026-12', alta)).toBe(false)
  })

  it('false si no hay fecha de alta', () => {
    expect(isAnnualBillingDue('2026-03', null)).toBe(false)
    expect(isAnnualBillingDue('2026-03', undefined)).toBe(false)
  })

  it('compara en UTC (no en hora local)', () => {
    // 1 de enero 00:30 UTC → mes 0 (enero) en UTC
    const alta = new Date('2026-01-01T00:30:00.000Z')
    expect(isAnnualBillingDue('2026-01', alta)).toBe(true)
    expect(isAnnualBillingDue('2025-12', alta)).toBe(false)
  })
})
