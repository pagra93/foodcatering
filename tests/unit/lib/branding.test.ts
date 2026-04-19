import { describe, it, expect } from 'vitest'
import { contrastText, buildBrandingStyle } from '@/lib/branding'

describe('branding helpers', () => {
  describe('contrastText', () => {
    it('devuelve blanco sobre fondos oscuros', () => {
      expect(contrastText('#000000')).toBe('#ffffff')
      expect(contrastText('#1E3A8A')).toBe('#ffffff')
      expect(contrastText('#6366F1')).toBe('#ffffff')
    })

    it('devuelve oscuro sobre fondos claros', () => {
      expect(contrastText('#FFFFFF')).toBe('#111827')
      expect(contrastText('#FEF3C7')).toBe('#111827')
      expect(contrastText('#FBCFE8')).toBe('#111827')
    })

    it('maneja hex inválido con fallback blanco', () => {
      expect(contrastText('')).toBe('#ffffff')
      expect(contrastText(null)).toBe('#ffffff')
      expect(contrastText('#xyz')).toBe('#ffffff')
    })

    it('es case-insensitive', () => {
      expect(contrastText('#abcdef')).toBe(contrastText('#ABCDEF'))
    })
  })

  describe('buildBrandingStyle', () => {
    it('incluye CSS vars básicas', () => {
      const s = buildBrandingStyle({
        primaryColor: '#3B82F6',
        secondaryColor: null,
        logoUrl: null,
        faviconUrl: null,
        brandName: 'Test',
        primaryForeground: '#ffffff',
      })
      expect(s['--brand-primary']).toBe('#3B82F6')
      expect(s['--brand-primary-foreground']).toBe('#ffffff')
      expect(s['--brand-secondary']).toBeUndefined()
    })

    it('incluye secondary cuando hay', () => {
      const s = buildBrandingStyle({
        primaryColor: '#3B82F6',
        secondaryColor: '#8B5CF6',
        logoUrl: null,
        faviconUrl: null,
        brandName: 'Test',
        primaryForeground: '#ffffff',
      })
      expect(s['--brand-secondary']).toBe('#8B5CF6')
    })
  })
})
