/**
 * Suite: parseo del JSON `dietPrefs` de Employee.
 */

import { describe, expect, it } from 'vitest'
import { parseDietPrefs } from '@/lib/types/diet-prefs'

describe('parseDietPrefs', () => {
  it('devuelve defaults para null/undefined', () => {
    const parsed = parseDietPrefs(null)
    expect(parsed.allergies).toEqual([])
    expect(parsed.restrictions).toEqual([])
    expect(parsed.preferences).toEqual([])
    expect(parsed.blockAllergensEnabled).toBe(false)
  })

  it('devuelve defaults para objeto vacío', () => {
    const parsed = parseDietPrefs({})
    expect(parsed.allergies).toEqual([])
    expect(parsed.blockAllergensEnabled).toBe(false)
  })

  it('conserva valores válidos', () => {
    const parsed = parseDietPrefs({
      allergies: ['gluten', 'lactosa'],
      restrictions: ['vegetariano'],
      preferences: ['bajo_en_sal'],
      blockAllergensEnabled: true,
    })
    expect(parsed.allergies).toEqual(['gluten', 'lactosa'])
    expect(parsed.restrictions).toEqual(['vegetariano'])
    expect(parsed.blockAllergensEnabled).toBe(true)
  })

  it('campos ausentes reciben defaults', () => {
    const parsed = parseDietPrefs({ allergies: ['gluten'] })
    expect(parsed.allergies).toEqual(['gluten'])
    expect(parsed.restrictions).toEqual([])
    expect(parsed.preferences).toEqual([])
    expect(parsed.blockAllergensEnabled).toBe(false)
  })

  it('rechaza tipos inválidos (Zod lanza)', () => {
    expect(() => parseDietPrefs({ allergies: 'gluten' })).toThrow()
    expect(() => parseDietPrefs({ blockAllergensEnabled: 'true' })).toThrow()
  })
})
