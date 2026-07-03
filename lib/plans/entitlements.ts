/**
 * Resolución de entitlements de una empresa a partir de su plan SaaS
 * (`Company.saasPlanId` → `SaasPlan` + `PlanFeature`). Espejo, a nivel de
 * empresa/tenant, de `resolveUserPermissions` (que es por usuario).
 *
 * Uso:
 *   const ent = await getCompanyEntitlements(session.user.tenantId)
 *   if (!companyHasFeature(ent, 'fiscal-audit')) { ...bloquear/upsell... }
 *   if (!withinLimit(ent, 'maxEmployees', currentCount)) { throw new PlanLimitError(...) }
 */

import { cache } from 'react'
import { prisma } from '@/lib/db/prisma'
import { CORE_FEATURE_KEYS, type LimitKey } from './feature-catalog'

export type CompanyEntitlements = {
  planId: string | null
  planCode: string | null
  planName: string | null
  features: Set<string>
  limits: {
    maxEmployees: number | null
    maxSites: number | null
    maxCaterings: number | null
  }
}

/** Entitlements por defecto si la empresa no tiene plan (no bloquear por config). */
function defaultEntitlements(): CompanyEntitlements {
  return {
    planId: null,
    planCode: null,
    planName: null,
    features: new Set(CORE_FEATURE_KEYS),
    limits: { maxEmployees: null, maxSites: null, maxCaterings: null },
  }
}

/**
 * Resuelve las features + límites de una empresa por su `tenantId` (el
 * `tenantEmpresa`). Memoizado por request con React `cache`.
 */
export const getCompanyEntitlements = cache(
  async (tenantEmpresa: string): Promise<CompanyEntitlements> => {
    const company = await prisma.company.findUnique({
      where: { tenantId: tenantEmpresa },
      select: {
        saasPlan: {
          select: {
            id: true,
            code: true,
            name: true,
            active: true,
            maxEmployees: true,
            maxSites: true,
            maxCaterings: true,
            planFeatures: { select: { featureKey: true } },
          },
        },
      },
    })

    const plan = company?.saasPlan
    if (!plan) return defaultEntitlements()

    // Las core están siempre; el resto salen del plan.
    const features = new Set<string>(CORE_FEATURE_KEYS)
    for (const f of plan.planFeatures) features.add(f.featureKey)

    return {
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      features,
      limits: {
        maxEmployees: plan.maxEmployees,
        maxSites: plan.maxSites,
        maxCaterings: plan.maxCaterings,
      },
    }
  }
)

/** ¿El plan de la empresa incluye esta feature? */
export function companyHasFeature(
  ent: CompanyEntitlements,
  featureKey: string
): boolean {
  return ent.features.has(featureKey)
}

/** Límite del plan para una cuota (null = ilimitado). */
export function limitFor(ent: CompanyEntitlements, key: LimitKey): number | null {
  return ent.limits[key]
}

/**
 * ¿Cabe una unidad más dentro de la cuota? `current` = nº de elementos actuales.
 * true si el límite es ilimitado (null) o si `current < límite`.
 */
export function withinLimit(
  ent: CompanyEntitlements,
  key: LimitKey,
  current: number
): boolean {
  const limit = ent.limits[key]
  if (limit == null) return true
  return current < limit
}

/** Error tipado para superación de cuota → la UI muestra CTA de upgrade. */
export class PlanLimitError extends Error {
  readonly code = 'PLAN_LIMIT'
  constructor(
    public readonly limitKey: LimitKey,
    public readonly limit: number,
    message?: string
  ) {
    super(message ?? `Has alcanzado el límite de tu plan (${limit}).`)
    this.name = 'PlanLimitError'
  }
}

/** Error tipado para feature no incluida en el plan. */
export class PlanFeatureError extends Error {
  readonly code = 'PLAN_FEATURE'
  constructor(public readonly featureKey: string, message?: string) {
    super(message ?? 'Esta funcionalidad no está incluida en tu plan.')
    this.name = 'PlanFeatureError'
  }
}
