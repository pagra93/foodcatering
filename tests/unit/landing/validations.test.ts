import { describe, expect, it } from 'vitest'

import {
  calculatorInputSchema,
  demoRequestSchema,
} from '@/lib/validations/landing'

describe('calculatorInputSchema', () => {
  const valid = {
    employees: 50,
    daysUsedPerEmployee: 16,
    companyContributionPerDay: 9,
    employeeContributionPerDay: 2,
    marginalTaxRate: 0.3,
  }

  it('accepts valid input', () => {
    expect(calculatorInputSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects zero employees', () => {
    const res = calculatorInputSchema.safeParse({ ...valid, employees: 0 })
    expect(res.success).toBe(false)
  })

  it('rejects more than 10000 employees', () => {
    const res = calculatorInputSchema.safeParse({
      ...valid,
      employees: 10001,
    })
    expect(res.success).toBe(false)
  })

  it('rejects marginal tax rate below 19%', () => {
    const res = calculatorInputSchema.safeParse({
      ...valid,
      marginalTaxRate: 0.15,
    })
    expect(res.success).toBe(false)
  })

  it('rejects marginal tax rate above 47%', () => {
    const res = calculatorInputSchema.safeParse({
      ...valid,
      marginalTaxRate: 0.5,
    })
    expect(res.success).toBe(false)
  })

  it('rejects negative copay', () => {
    const res = calculatorInputSchema.safeParse({
      ...valid,
      employeeContributionPerDay: -1,
    })
    expect(res.success).toBe(false)
  })
})

describe('demoRequestSchema', () => {
  const valid = {
    name: 'Ana García',
    email: 'ana@empresa.com',
    company: 'Empresa SL',
    employees: 100,
    role: 'empresa' as const,
    message: 'Queremos probarlo',
    gdprConsent: true as const,
  }

  it('accepts valid corporate request', () => {
    expect(demoRequestSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects personal email domains (gmail, hotmail, etc.)', () => {
    for (const email of [
      'ana@gmail.com',
      'ana@hotmail.com',
      'ana@yahoo.com',
      'ana@icloud.com',
      'ana@outlook.com',
    ]) {
      const res = demoRequestSchema.safeParse({ ...valid, email })
      expect(res.success, `email ${email} should be rejected`).toBe(false)
    }
  })

  it('rejects missing gdpr consent', () => {
    const res = demoRequestSchema.safeParse({
      ...valid,
      gdprConsent: false,
    })
    expect(res.success).toBe(false)
  })

  it('accepts catering role', () => {
    const res = demoRequestSchema.safeParse({ ...valid, role: 'catering' })
    expect(res.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const res = demoRequestSchema.safeParse({ ...valid, role: 'other' })
    expect(res.success).toBe(false)
  })

  it('rejects empty company name', () => {
    const res = demoRequestSchema.safeParse({ ...valid, company: '' })
    expect(res.success).toBe(false)
  })

  it('accepts without message (optional)', () => {
    const { message: _m, ...noMessage } = valid
    const res = demoRequestSchema.safeParse(noMessage)
    expect(res.success).toBe(true)
  })
})
