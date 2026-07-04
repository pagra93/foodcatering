import { describe, it, expect } from 'vitest'
import { contrastText, buildBrandingStyle, hexToHslTriple } from '@/lib/branding'

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

    it('emite las variables del tema shadcn ligadas al tenant (white-label)', () => {
      const s = buildBrandingStyle({
        primaryColor: '#3B82F6',
        secondaryColor: null,
        logoUrl: null,
        faviconUrl: null,
        brandName: 'Test',
        primaryForeground: '#ffffff',
      })
      // #3B82F6 → HSL ~ 217 91% 60%
      expect(s['--primary']).toBe('217 91% 60%')
      expect(s['--primary-foreground']).toBe('0 0% 100%')
      expect(s['--ring']).toBe('217 91% 60%')
    })

    it('no sobreescribe el tema si el color no es hex válido', () => {
      const s = buildBrandingStyle({
        primaryColor: 'rebeccapurple',
        secondaryColor: null,
        logoUrl: null,
        faviconUrl: null,
        brandName: 'Test',
        primaryForeground: '#ffffff',
      })
      expect(s['--primary']).toBeUndefined()
    })
  })

  describe('hexToHslTriple', () => {
    it('convierte hex a triplete HSL', () => {
      expect(hexToHslTriple('#000000')).toBe('0 0% 0%')
      expect(hexToHslTriple('#ffffff')).toBe('0 0% 100%')
      expect(hexToHslTriple('#3B82F6')).toBe('217 91% 60%')
      expect(hexToHslTriple('#10B981')).toBe('160 84% 39%')
    })

    it('devuelve null para hex inválido', () => {
      expect(hexToHslTriple('')).toBeNull()
      expect(hexToHslTriple(null)).toBeNull()
      expect(hexToHslTriple('#abc')).toBeNull()
      expect(hexToHslTriple('tomato')).toBeNull()
    })
  })
})
