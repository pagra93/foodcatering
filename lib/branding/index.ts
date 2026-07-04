/**
 * Helpers de branding: colores efectivos (tenant → defaults → fallback),
 * cálculo de contraste, CSS variables para aplicar.
 */

import { cache } from 'react'
import { prisma } from '@/lib/db/prisma'

export type EffectiveBranding = {
  primaryColor: string
  secondaryColor: string | null
  logoUrl: string | null
  faviconUrl: string | null
  brandName: string
  /** Color de texto legible sobre el primary (blanco o negro). */
  primaryForeground: string
}

const FALLBACK_PRIMARY = '#E0492A' // tomate Plati

/**
 * Calcula color de texto legible sobre un fondo dado mediante luminancia
 * relativa. Si el fondo es claro → texto oscuro; si es oscuro → texto
 * blanco. Aproximación simple pero suficiente para UI de portal.
 */
export function contrastText(hex: string | null | undefined): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return '#ffffff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Perceived brightness (ITU-R BT.601)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000 / 255
  return brightness > 0.6 ? '#111827' : '#ffffff'
}

/**
 * Resuelve branding efectivo para un tenant.
 * 1. Campos del tenant si están seteados.
 * 2. Defaults del sistema (SystemSettings singleton).
 * 3. Fallback hardcoded.
 *
 * `cache()` de React deduplica dentro del mismo request.
 */
export const getEffectiveBranding = cache(
  async (tenantId: string | null | undefined): Promise<EffectiveBranding> => {
    const [tenant, settings] = await Promise.all([
      tenantId
        ? prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
              primaryColor: true,
              secondaryColor: true,
              logoUrl: true,
              faviconUrl: true,
            },
          })
        : Promise.resolve(null),
      prisma.systemSettings.findUnique({ where: { id: 'singleton' } }),
    ])

    const primaryColor =
      tenant?.primaryColor ?? settings?.defaultPrimaryColor ?? FALLBACK_PRIMARY
    const secondaryColor =
      tenant?.secondaryColor ?? settings?.defaultSecondaryColor ?? null
    const logoUrl = tenant?.logoUrl ?? settings?.defaultLogoUrl ?? null
    const faviconUrl =
      tenant?.faviconUrl ?? settings?.defaultFaviconUrl ?? null
    const brandName = settings?.brandName ?? 'Plati'

    return {
      primaryColor,
      secondaryColor,
      logoUrl,
      faviconUrl,
      brandName,
      primaryForeground: contrastText(primaryColor),
    }
  }
)

/**
 * Convierte un color hex `#RRGGBB` al triplete HSL `'H S% L%'` que usa el tema
 * (shadcn define p. ej. `--primary: 12 73% 52%`). Devuelve null si no es un hex
 * válido de 6 dígitos.
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
 * Construye un objeto style con CSS variables inyectables en un wrapper.
 * Uso en layout: `<div style={buildBrandingStyle(branding)}>...</div>`
 *
 * Emite dos familias:
 *  · `--brand-*` (hex) — para estilos inline puntuales que ya las usan.
 *  · variables del tema shadcn (`--primary`, `--primary-foreground`, `--ring`,
 *    `--secondary`, `--secondary-foreground`) en formato HSL, para que TODO el
 *    portal (botones, enlaces, foco…) tome el color del tenant, no solo la
 *    navegación. Solo se sobreescriben cuando el color es un hex válido.
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

  // Tema shadcn ligado al tenant (white-label completo).
  const primaryHsl = hexToHslTriple(b.primaryColor)
  if (primaryHsl) {
    style['--primary'] = primaryHsl
    // El foreground del tema es HSL; derivamos claro/oscuro del contraste.
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
