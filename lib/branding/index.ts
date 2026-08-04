/**
 * Branding: resolución con BD (server-only) + re-export de los helpers puros.
 * Los componentes de CLIENTE deben importar de '@/lib/branding/colors' (puro),
 * no de aquí (este barrel arrastra Prisma).
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
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

async function loadEffectiveBranding(
  tenantId: string | null | undefined
): Promise<EffectiveBranding> {
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

/**
 * Resuelve branding efectivo para un tenant (tenant → defaults → fallback).
 * - `unstable_cache` por tenant (B7): el layout deja de pagar 2 queries en
 *   CADA navegación por datos que cambian una vez al mes. Tag
 *   `branding:<tenantId>` para invalidar desde mutaciones; `revalidate` 300 s
 *   como red de seguridad si nadie invalida.
 * - `cache()` de React sigue deduplicando dentro del mismo request.
 * (Solo valores serializables — strings/null — aptos para unstable_cache.)
 */
export const getEffectiveBranding = cache(
  async (tenantId: string | null | undefined): Promise<EffectiveBranding> => {
    const key = tenantId ?? 'none'
    return unstable_cache(
      () => loadEffectiveBranding(tenantId),
      ['effective-branding', key],
      { tags: [`branding:${key}`, 'branding'], revalidate: 300 }
    )()
  }
)
