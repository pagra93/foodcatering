/**
 * Branding: resolución con BD (server-only) + re-export de los helpers puros.
 * Los componentes de CLIENTE deben importar de '@/lib/branding/colors' (puro),
 * no de aquí (este barrel arrastra Prisma).
 */

import { cache } from 'react'
import { prisma } from '@/lib/db/prisma'
import {
  type EffectiveBranding,
  FALLBACK_PRIMARY,
  contrastText,
} from './colors'

// Re-export de los helpers puros para no romper importadores de servidor.
export {
  type EffectiveBranding,
  FALLBACK_PRIMARY,
  contrastText,
  hexToHslTriple,
  buildBrandingStyle,
} from './colors'

/**
 * Resuelve branding efectivo para un tenant (tenant → defaults → fallback).
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
    const faviconUrl = tenant?.faviconUrl ?? settings?.defaultFaviconUrl ?? null
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
