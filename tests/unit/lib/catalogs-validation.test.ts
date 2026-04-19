/**
 * Tests de validación para catálogos (Sprint 8).
 * Verifica que los schemas Zod rechazan input inválido y aceptan lo esperado.
 */

import { describe, expect, it } from 'vitest'
import {
  upsertAllergenSchema,
  upsertOfficialHolidaySchema,
  upsertTenantHolidaySchema,
  toggleHolidayOverrideSchema,
  upsertIncidentReasonSchema,
  upsertMenuTemplateSchema,
  upsertDeliveryZoneSchema,
} from '@/lib/validations/catalogs'

describe('upsertAllergenSchema', () => {
  it('acepta un alérgeno válido', () => {
    const r = upsertAllergenSchema.parse({
      code: 'gluten',
      name: 'Gluten',
      category: 'CEREALS_WITH_GLUTEN',
    })
    expect(r.active).toBe(true)
  })

  it('rechaza código con mayúsculas', () => {
    expect(() =>
      upsertAllergenSchema.parse({
        code: 'Gluten',
        name: 'Gluten',
        category: 'CEREALS_WITH_GLUTEN',
      })
    ).toThrow()
  })

  it('rechaza categoría inválida', () => {
    expect(() =>
      upsertAllergenSchema.parse({
        code: 'x',
        name: 'x',
        category: 'NOT_EU_CATEGORY',
      })
    ).toThrow()
  })
})

describe('upsertOfficialHolidaySchema', () => {
  it('acepta NATIONAL sin región', () => {
    const r = upsertOfficialHolidaySchema.parse({
      date: '2026-01-01',
      name: 'Año Nuevo',
      scope: 'NATIONAL',
    })
    expect(r.scope).toBe('NATIONAL')
  })

  it('acepta REGION con código', () => {
    const r = upsertOfficialHolidaySchema.parse({
      date: '2026-03-19',
      name: 'San José',
      scope: 'REGION',
      regionCode: 'ES-VC',
    })
    expect(r.regionCode).toBe('ES-VC')
  })

  it('rechaza scope TENANT para festivo oficial', () => {
    expect(() =>
      upsertOfficialHolidaySchema.parse({
        date: '2026-01-01',
        name: 'x',
        scope: 'TENANT',
      })
    ).toThrow()
  })
})

describe('upsertTenantHolidaySchema', () => {
  it('no requiere scope (siempre TENANT)', () => {
    const r = upsertTenantHolidaySchema.parse({
      date: '2026-06-15',
      name: 'Aniversario empresa',
    })
    expect(r.name).toBe('Aniversario empresa')
  })
})

describe('toggleHolidayOverrideSchema', () => {
  it('requiere holidayId UUID', () => {
    expect(() =>
      toggleHolidayOverrideSchema.parse({
        holidayId: 'not-a-uuid',
        disabled: true,
      })
    ).toThrow()
  })

  it('acepta válido', () => {
    const r = toggleHolidayOverrideSchema.parse({
      holidayId: '00000000-0000-4000-8000-000000000001',
      disabled: true,
    })
    expect(r.disabled).toBe(true)
  })
})

describe('upsertIncidentReasonSchema', () => {
  it('default active=true y requiresCompensation=false', () => {
    const r = upsertIncidentReasonSchema.parse({
      code: 'cold_food',
      name: 'Comida fría',
      category: 'QUALITY',
      defaultSeverity: 'MEDIUM',
    })
    expect(r.active).toBe(true)
    expect(r.requiresCompensation).toBe(false)
  })

  it('rechaza severidad inválida', () => {
    expect(() =>
      upsertIncidentReasonSchema.parse({
        code: 'x',
        name: 'x',
        category: 'x',
        defaultSeverity: 'CRITICAL',
      })
    ).toThrow()
  })
})

describe('upsertMenuTemplateSchema', () => {
  it('acepta estructura con strings en lugar de UUIDs', () => {
    const r = upsertMenuTemplateSchema.parse({
      name: 'Mediterránea',
      structure: {
        monday: { first: ['Gazpacho'], second: ['Pollo'], dessert: ['Fruta'] },
        tuesday: { first: [], second: [], dessert: [] },
        wednesday: { first: [], second: [], dessert: [] },
        thursday: { first: [], second: [], dessert: [] },
        friday: { first: [], second: [], dessert: [] },
      },
    })
    expect(r.structure.monday.first).toEqual(['Gazpacho'])
  })

  it('rechaza si falta un día de la semana', () => {
    expect(() =>
      upsertMenuTemplateSchema.parse({
        name: 'x',
        structure: {
          monday: { first: [], second: [], dessert: [] },
        },
      })
    ).toThrow()
  })
})

describe('upsertDeliveryZoneSchema', () => {
  it('valida CP español de 5 dígitos', () => {
    const r = upsertDeliveryZoneSchema.parse({
      name: 'Centro',
      postalCodes: ['28001', '28002'],
    })
    expect(r.postalCodes).toEqual(['28001', '28002'])
  })

  it('rechaza CP con letras', () => {
    expect(() =>
      upsertDeliveryZoneSchema.parse({
        name: 'Centro',
        postalCodes: ['ABCDE'],
      })
    ).toThrow()
  })

  it('rechaza CP con 4 dígitos', () => {
    expect(() =>
      upsertDeliveryZoneSchema.parse({
        name: 'Centro',
        postalCodes: ['2800'],
      })
    ).toThrow()
  })

  it('requiere al menos un CP', () => {
    expect(() =>
      upsertDeliveryZoneSchema.parse({
        name: 'Centro',
        postalCodes: [],
      })
    ).toThrow()
  })

  it('rechaza maxDistanceKm > 500', () => {
    expect(() =>
      upsertDeliveryZoneSchema.parse({
        name: 'Centro',
        postalCodes: ['28001'],
        maxDistanceKm: 600,
      })
    ).toThrow()
  })
})
