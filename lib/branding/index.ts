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
 * Construye un objeto style con CSS variables inyectables en un wrapper.
 * Uso en layout: `<div style={buildBrandingStyle(branding)}>...</div>`
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
  return style
}
