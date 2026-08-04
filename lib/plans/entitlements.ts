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
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import {
  EMPRESA_CORE_KEYS,
  CATERING_CORE_KEYS,
  type LimitKey,
} from './feature-catalog'

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

/**
 * Entitlements para una empresa SIN plan (o con plan inactivo). Fail-closed
 * (M4): solo features core y cuotas a 0 — no se puede crecer sin un plan. Como
 * el plan es obligatorio al crear, este caso es un borde de seguridad; antes
 * daba límites ilimitados (fail-open).
 */
function defaultEntitlements(): CompanyEntitlements {
  return {
    planId: null,
    planCode: null,
    planName: null,
    features: new Set(EMPRESA_CORE_KEYS),
    limits: { maxEmployees: 0, maxSites: 0, maxCaterings: 0 },
  }
}

/** Shape serializable para unstable_cache (Set no sobrevive a JSON). */
type CachedCompanyEntitlements = Omit<CompanyEntitlements, 'features'> & {
  features: string[]
}

async function loadCompanyEntitlements(
  tenantEmpresa: string
): Promise<CachedCompanyEntitlements> {
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
  // Sin plan, o con el plan DESACTIVADO, la empresa solo tiene las features
  // core (M2: un plan desactivado deja de dar acceso premium gratis; queda
  // alineado con la facturación, que solo factura planes activos).
  if (!plan || !plan.active) {
    const def = defaultEntitlements()
    return { ...def, features: Array.from(def.features) }
  }

  // Las core están siempre; el resto salen del plan.
  const features = new Set<string>(EMPRESA_CORE_KEYS)
  for (const f of plan.planFeatures) features.add(f.featureKey)

  return {
    planId: plan.id,
    planCode: plan.code,
    planName: plan.name,
    features: Array.from(features),
    limits: {
      maxEmployees: plan.maxEmployees,
      maxSites: plan.maxSites,
      maxCaterings: plan.maxCaterings,
    },
  }
}

/**
 * Resuelve las features + límites de una empresa por su `tenantId` (el
 * `tenantEmpresa`).
 *
 * - `unstable_cache` (C6): el layout y los guards dejan de pagar la query en
 *   cada navegación. Tags `entitlements:<tenant>` + `entitlements` global (las
 *   actions de planes invalidan la global al editar/borrar un plan) y
 *   `revalidate` 300 s como techo de staleness — un cambio de plan tarda como
 *   MUCHO 5 min en reflejarse; las cuotas duras además recuentan en su tx.
 * - `cache()` de React sigue deduplicando dentro del request.
 */
export const getCompanyEntitlements = cache(
  async (tenantEmpresa: string): Promise<CompanyEntitlements> => {
    const cached = await unstable_cache(
      () => loadCompanyEntitlements(tenantEmpresa),
      ['company-entitlements', tenantEmpresa],
      {
        tags: [`entitlements:${tenantEmpresa}`, 'entitlements'],
        revalidate: 300,
      }
    )()
    return { ...cached, features: new Set(cached.features) }
  }
)

export type PlanUsage = {
  entitlements: CompanyEntitlements
  usage: { employees: number; sites: number; caterings: number }
}

/** Plan + uso actual (empleados/sedes/caterings) para la vista de la empresa. */
export async function getCompanyPlanUsage(tenantEmpresa: string): Promise<PlanUsage> {
  const [entitlements, employees, sites, caterings] = await Promise.all([
    getCompanyEntitlements(tenantEmpresa),
    prisma.employee.count({ where: { tenantId: tenantEmpresa, status: 'ACTIVE' } }),
    prisma.companySite.count({ where: { tenantId: tenantEmpresa, active: true } }),
    prisma.companyCateringAssignment.count({
      where: { company: { tenantId: tenantEmpresa } },
    }),
  ])
  return { entitlements, usage: { employees, sites, caterings } }
}

/** ¿El plan de la empresa incluye esta feature? */
export function companyHasFeature(
  ent: CompanyEntitlements,
  featureKey: string
): boolean {
  return ent.features.has(featureKey)
}

/** Límite del plan para una cuota (null = ilimitado). */
type EmpresaLimitKey = 'maxEmployees' | 'maxSites' | 'maxCaterings'

export function limitFor(ent: CompanyEntitlements, key: EmpresaLimitKey): number | null {
  return ent.limits[key]
}

/** ¿Cabe una unidad más dentro de un límite concreto? (null = ilimitado). */
export function withinLimitOf(limit: number | null, current: number): boolean {
  if (limit == null) return true
  return current < limit
}

/**
 * ¿Cabe una unidad más dentro de la cuota de empresa? `current` = nº actual.
 */
export function withinLimit(
  ent: CompanyEntitlements,
  key: EmpresaLimitKey,
  current: number
): boolean {
  return withinLimitOf(ent.limits[key], current)
}

// ── Catering ─────────────────────────────────────────────────────────────────

export type CateringPricing = {
  model: 'COMMISSION' | 'FIXED' | null
  commissionPct: number | null
  flatMonthlyFee: number | null
}

export type CateringEntitlements = {
  planId: string | null
  planCode: string | null
  planName: string | null
  features: Set<string>
  maxCompanies: number | null
  pricing: CateringPricing
}

function defaultCateringEntitlements(): CateringEntitlements {
  return {
    planId: null,
    planCode: null,
    planName: null,
    features: new Set(CATERING_CORE_KEYS),
    maxCompanies: null,
    pricing: { model: null, commissionPct: null, flatMonthlyFee: null },
  }
}

/** Resuelve features + límite de empresas + cobro de un catering por su tenantId. */
export const getCateringEntitlements = cache(
  async (tenantCatering: string): Promise<CateringEntitlements> => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { tenantId: tenantCatering },
      select: {
        saasPlan: {
          select: {
            id: true,
            code: true,
            name: true,
            maxCompanies: true,
            pricingModel: true,
            commissionPct: true,
            flatMonthlyFee: true,
            planFeatures: { select: { featureKey: true } },
          },
        },
      },
    })

    const plan = restaurant?.saasPlan
    if (!plan) return defaultCateringEntitlements()

    const features = new Set<string>(CATERING_CORE_KEYS)
    for (const f of plan.planFeatures) features.add(f.featureKey)

    return {
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      features,
      maxCompanies: plan.maxCompanies,
      pricing: {
        model: plan.pricingModel ?? null,
        commissionPct: plan.commissionPct != null ? Number(plan.commissionPct) : null,
        flatMonthlyFee: plan.flatMonthlyFee != null ? Number(plan.flatMonthlyFee) : null,
      },
    }
  }
)

export function cateringHasFeature(
  ent: CateringEntitlements,
  featureKey: string
): boolean {
  return ent.features.has(featureKey)
}

export type CateringPlanUsage = {
  entitlements: CateringEntitlements
  usage: { companies: number }
}

/** Plan + uso (nº de empresas servidas) para la vista del catering. */
export async function getCateringPlanUsage(
  tenantCatering: string
): Promise<CateringPlanUsage> {
  const [entitlements, companies] = await Promise.all([
    getCateringEntitlements(tenantCatering),
    prisma.companyCateringAssignment.count({
      where: { tenantCatering, active: true },
    }),
  ])
  return { entitlements, usage: { companies } }
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
