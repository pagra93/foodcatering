import { describe, expect, it } from 'vitest'

import {
  CORPORATE_TAX_RATE,
  DEFAULT_CALCULATOR_INPUT,
  DEFAULT_MARGINAL_RATE,
  IRPF_LIMIT_PER_DAY,
  calculateIrpfSavings,
  decodeCalculatorUrlParams,
  encodeCalculatorUrlParams,
} from '@/lib/landing/irpf'

describe('calculateIrpfSavings', () => {
  it('calculates expected outputs for default inputs', () => {
    const r = calculateIrpfSavings(DEFAULT_CALCULATOR_INPUT)
    // 50 empleados × 16 días × 9€ = 7200 €/mes
    expect(r.monthlyCompanyCost).toBe(50 * 16 * 9)
    // × 11 meses efectivos = 79 200 €/año
    expect(r.annualCompanyCost).toBe(50 * 16 * 9 * 11)
    // Base imponible anual ahorrada = min(9, 11) × 16 × 11 × 50 = 79 200 €
    expect(r.annualTaxableBaseSaving).toBe(9 * 16 * 11 * 50)
    // Ahorro fiscal = base × 30%
    expect(r.annualEmployeeTaxSaving).toBeCloseTo(
      9 * 16 * 11 * 50 * DEFAULT_MARGINAL_RATE,
    )
    expect(r.exceedsIrpfLimit).toBe(false)
    expect(r.excessPerDay).toBe(0)
  })

  it('caps deductible at IRPF_LIMIT_PER_DAY when copay exceeds 11€', () => {
    const r = calculateIrpfSavings({
      ...DEFAULT_CALCULATOR_INPUT,
      companyContributionPerDay: 15,
    })
    // Base solo incluye los primeros 11€
    expect(r.annualTaxableBaseSaving).toBe(
      IRPF_LIMIT_PER_DAY * 16 * 11 * 50,
    )
    expect(r.exceedsIrpfLimit).toBe(true)
    expect(r.excessPerDay).toBe(4)
    // Coste de empresa sigue contando todo el copay (15€)
    expect(r.monthlyCompanyCost).toBe(50 * 16 * 15)
  })

  it('returns zero savings when no employees', () => {
    const r = calculateIrpfSavings({
      ...DEFAULT_CALCULATOR_INPUT,
      employees: 0,
    })
    expect(r.monthlyCompanyCost).toBe(0)
    expect(r.annualCompanyCost).toBe(0)
    expect(r.annualTaxableBaseSaving).toBe(0)
    expect(r.annualEmployeeTaxSaving).toBe(0)
    expect(r.avgMonthlyPerEmployee).toBe(0)
  })

  it('returns zero savings when no days used', () => {
    const r = calculateIrpfSavings({
      ...DEFAULT_CALCULATOR_INPUT,
      daysUsedPerEmployee: 0,
    })
    expect(r.monthlyCompanyCost).toBe(0)
    expect(r.annualTaxableBaseSaving).toBe(0)
  })

  it('clamps marginal tax rate to [0, 1]', () => {
    const overflow = calculateIrpfSavings({
      ...DEFAULT_CALCULATOR_INPUT,
      marginalTaxRate: 1.5,
    })
    const underflow = calculateIrpfSavings({
      ...DEFAULT_CALCULATOR_INPUT,
      marginalTaxRate: -0.2,
    })
    expect(overflow.annualEmployeeTaxSaving).toBeCloseTo(
      overflow.annualTaxableBaseSaving * 1,
    )
    expect(underflow.annualEmployeeTaxSaving).toBe(0)
  })

  it('handles extreme marginal rates (19% and 47%)', () => {
    const low = calculateIrpfSavings({
      ...DEFAULT_CALCULATOR_INPUT,
      marginalTaxRate: 0.19,
    })
    const high = calculateIrpfSavings({
      ...DEFAULT_CALCULATOR_INPUT,
      marginalTaxRate: 0.47,
    })
    expect(low.annualEmployeeTaxSaving).toBeCloseTo(
      low.annualTaxableBaseSaving * 0.19,
    )
    expect(high.annualEmployeeTaxSaving).toBeCloseTo(
      high.annualTaxableBaseSaving * 0.47,
    )
    expect(high.annualEmployeeTaxSaving).toBeGreaterThan(
      low.annualEmployeeTaxSaving,
    )
  })

  it('rounds employees down (no fractional employees)', () => {
    const r = calculateIrpfSavings({
      ...DEFAULT_CALCULATOR_INPUT,
      employees: 50.9,
    })
    expect(r.monthlyCompanyCost).toBe(50 * 16 * 9)
  })

  it('computes the employee co-pay (split empresa/empleado)', () => {
    const r = calculateIrpfSavings(DEFAULT_CALCULATOR_INPUT)
    // 50 empleados × 16 días × 2€ de copago = 1600 €/mes
    expect(r.monthlyEmployeeCost).toBe(50 * 16 * 2)
  })

  it('returns zero employee co-pay when the company pays 100%', () => {
    const r = calculateIrpfSavings({
      ...DEFAULT_CALCULATOR_INPUT,
      employeeContributionPerDay: 0,
    })
    expect(r.monthlyEmployeeCost).toBe(0)
  })

  it('computes the corporate-tax deduction and net cost (25% IS)', () => {
    const r = calculateIrpfSavings(DEFAULT_CALCULATOR_INPUT)
    const monthly = 50 * 16 * 9
    expect(r.monthlyCompanyTaxDeduction).toBeCloseTo(monthly * CORPORATE_TAX_RATE)
    expect(r.monthlyCompanyNetCost).toBeCloseTo(monthly * (1 - CORPORATE_TAX_RATE))
  })
})

describe('url params encoding/decoding', () => {
  it('encodes all fields', () => {
    const p = encodeCalculatorUrlParams({
      employees: 100,
      daysUsedPerEmployee: 20,
      companyContributionPerDay: 10,
      employeeContributionPerDay: 1,
      marginalTaxRate: 0.35,
    })
    expect(p.get('emp')).toBe('100')
    expect(p.get('dias')).toBe('20')
    expect(p.get('copayE')).toBe('10')
    expect(p.get('copayW')).toBe('1')
    expect(p.get('tmi')).toBe('35')
  })

  it('round-trips correctly', () => {
    const input = {
      employees: 200,
      daysUsedPerEmployee: 18,
      companyContributionPerDay: 11,
      employeeContributionPerDay: 0,
      marginalTaxRate: 0.3,
    }
    const encoded = encodeCalculatorUrlParams(input)
    const decoded = decodeCalculatorUrlParams(encoded)
    expect(decoded.employees).toBe(200)
    expect(decoded.daysUsedPerEmployee).toBe(18)
    expect(decoded.companyContributionPerDay).toBe(11)
    expect(decoded.employeeContributionPerDay).toBe(0)
    expect(decoded.marginalTaxRate).toBeCloseTo(0.3)
  })

  it('returns partial when some params missing', () => {
    const p = new URLSearchParams('emp=75&tmi=47')
    const decoded = decodeCalculatorUrlParams(p)
    expect(decoded.employees).toBe(75)
    expect(decoded.marginalTaxRate).toBeCloseTo(0.47)
    expect(decoded.daysUsedPerEmployee).toBeUndefined()
  })

  it('ignores invalid numeric params', () => {
    const p = new URLSearchParams('emp=abc&dias=xyz')
    const decoded = decodeCalculatorUrlParams(p)
    expect(decoded.employees).toBeUndefined()
    expect(decoded.daysUsedPerEmployee).toBeUndefined()
  })
})
