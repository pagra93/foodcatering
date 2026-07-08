/**
 * Helpers de branding PUROS (sin BD) — aptos para cliente y servidor.
 * La resolución con BD (getEffectiveBranding) vive en ./index.ts (server-only).
 */

export type EffectiveBranding = {
  primaryColor: string
  secondaryColor: string | null
  logoUrl: string | null
  faviconUrl: string | null
  brandName: string
  /** Color de texto legible sobre el primary (blanco o negro). */
  primaryForeground: string
}

export const FALLBACK_PRIMARY = '#E0492A' // tomate Plati

/**
 * Color de texto legible sobre un fondo dado (luminancia relativa).
 */
export function contrastText(hex: string | null | undefined): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return '#ffffff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000 / 255
  return brightness > 0.6 ? '#111827' : '#ffffff'
}

/**
 * Convierte un color hex `#RRGGBB` al triplete HSL `'H S% L%'` del tema shadcn.
 * Devuelve null si no es un hex válido de 6 dígitos.
 */
export function hexToHslTriple(hex: string | null | undefined): string | null {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h /= 6
  }
  const H = Math.round(h * 360)
  const S = Math.round(s * 100)
  const L = Math.round(l * 100)
  return `${H} ${S}% ${L}%`
}

/**
 * Objeto style con CSS variables inyectables (marca del tenant → tema shadcn).
 */
export function buildBrandingStyle(
  b: EffectiveBranding
): Record<string, string> {
  const style: Record<string, string> = {
    '--brand-primary': b.primaryColor,
    '--brand-primary-foreground': b.primaryForeground,
  }
  if (b.secondaryColor) {
    style['--brand-secondary'] = b.secondaryColor
  }

  const primaryHsl = hexToHslTriple(b.primaryColor)
  if (primaryHsl) {
    style['--primary'] = primaryHsl
    style['--primary-foreground'] =
      b.primaryForeground === '#ffffff' ? '0 0% 100%' : '222 47% 11%'
    style['--ring'] = primaryHsl
  }
  const secondaryHsl = hexToHslTriple(b.secondaryColor)
  if (secondaryHsl) {
    style['--secondary'] = secondaryHsl
    style['--secondary-foreground'] =
      contrastText(b.secondaryColor) === '#ffffff' ? '0 0% 100%' : '222 47% 11%'
  }

  return style
}
