import { describe, it, expect } from 'vitest'
import {
  generateMonthSchema,
  markPaidSchema,
  updateSaasPlanSchema,
  updateTaxRuleSchema,
} from '@/lib/validations/billing'

const validUuid = '11111111-2222-3333-4444-555555555555'

describe('billing validations', () => {
  describe('generateMonthSchema', () => {
    it('acepta formato YYYY-MM válido', () => {
      const r = generateMonthSchema.safeParse({ period: '2026-04', dryRun: false })
      expect(r.success).toBe(true)
    })

    it('rechaza formato incorrecto', () => {
      expect(generateMonthSchema.safeParse({ period: '2026/04' }).success).toBe(false)
      expect(generateMonthSchema.safeParse({ period: '26-04' }).success).toBe(false)
      expect(generateMonthSchema.safeParse({ period: '2026-4' }).success).toBe(false)
    })

    it('dryRun defaults a false', () => {
      const r = generateMonthSchema.parse({ period: '2026-04' })
      expect(r.dryRun).toBe(false)
    })
  })

  describe('updateSaasPlanSchema', () => {
    it('acepta plan válido', () => {
      const r = updateSaasPlanSchema.safeParse({
        code: 'STARTER',
        name: 'Starter',
        monthlyPrice: 49,
        yearlyPrice: 490,
        maxEmployees: 50,
        supportLevel: 'BASIC',
        active: true,
      })
      expect(r.success).toBe(true)
    })

    it('rechaza precio negativo', () => {
      const r = updateSaasPlanSchema.safeParse({
        code: 'STARTER',
        name: 'Starter',
        monthlyPrice: -10,
        supportLevel: 'BASIC',
        active: true,
      })
      expect(r.success).toBe(false)
    })

    it('rechaza code desconocido', () => {
      const r = updateSaasPlanSchema.safeParse({
        code: 'UNKNOWN',
        name: 'Unknown',
        monthlyPrice: 1,
        supportLevel: 'BASIC',
        active: true,
      })
      expect(r.success).toBe(false)
    })
  })

  describe('markPaidSchema', () => {
    it('acepta solo id', () => {
      const r = markPaidSchema.safeParse({ id: validUuid })
      expect(r.success).toBe(true)
    })

    it('rechaza id no uuid', () => {
      const r = markPaidSchema.safeParse({ id: 'no-uuid' })
      expect(r.success).toBe(false)
    })
  })

  describe('updateTaxRuleSchema', () => {
    it('acepta reglas con tasa 0-100', () => {
      const r = updateTaxRuleSchema.safeParse({
        code: 'IVA_COMIDA',
        name: 'IVA reducido',
        rate: 10,
        category: 'food',
        validFrom: '2026-01-01',
        active: true,
      })
      expect(r.success).toBe(true)
    })

    it('rechaza tasa > 100%', () => {
      const r = updateTaxRuleSchema.safeParse({
        code: 'X',
        name: 'X',
        rate: 150,
        category: 'food',
        validFrom: '2026-01-01',
        active: true,
      })
      expect(r.success).toBe(false)
    })
  })
})
