/**
 * Queries para catálogo de planes SaaS y reglas fiscales.
 */

// F5: panel admin = lecturas cross-tenant a propósito → cliente sin guard.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
import {
  FEATURE_CATALOG,
  FEATURE_CATEGORIES,
  CORE_FEATURE_KEYS,
  type PlanPortal,
} from '@/lib/plans/feature-catalog'

/** Planes + nº de features y de entidades asignadas (para la lista de gestión). */
export async function getPlansWithCounts() {
  const plans = await prisma.saasPlan.findMany({
    orderBy: [{ planType: 'asc' }, { scope: 'asc' }, { monthlyPrice: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      planType: true,
      scope: true,
      tenantEmpresa: true,
      monthlyPrice: true,
      yearlyPrice: true,
      maxEmployees: true,
      maxSites: true,
      maxCaterings: true,
      pricingModel: true,
      commissionPct: true,
      flatMonthlyFee: true,
      maxCompanies: true,
      supportLevel: true,
      active: true,
      _count: { select: { planFeatures: true, companies: true, restaurants: true } },
    },
  })
  return plans.map((p) => ({
    ...p,
    monthlyPrice: Number(p.monthlyPrice),
    yearlyPrice: p.yearlyPrice != null ? Number(p.yearlyPrice) : null,
    commissionPct: p.commissionPct != null ? Number(p.commissionPct) : null,
    flatMonthlyFee: p.flatMonthlyFee != null ? Number(p.flatMonthlyFee) : null,
    featuresCount: p._count.planFeatures,
    // Entidades con este plan: empresas si es EMPRESA, caterings si es CATERING.
    assignedCount:
      p.planType === 'CATERING' ? p._count.restaurants : p._count.companies,
  }))
}

/** Detalle de un plan + las claves de feature que tiene (para editar). */
export async function getPlanDetail(planId: string) {
  const plan = await prisma.saasPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      planType: true,
      scope: true,
      tenantEmpresa: true,
      monthlyPrice: true,
      yearlyPrice: true,
      maxEmployees: true,
      maxSites: true,
      maxCaterings: true,
      pricingModel: true,
      commissionPct: true,
      flatMonthlyFee: true,
      maxCompanies: true,
      supportLevel: true,
      active: true,
      planFeatures: { select: { featureKey: true } },
      _count: { select: { companies: true, restaurants: true } },
    },
  })
  if (!plan) return null
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    planType: plan.planType,
    scope: plan.scope,
    tenantEmpresa: plan.tenantEmpresa,
    monthlyPrice: Number(plan.monthlyPrice),
    yearlyPrice: plan.yearlyPrice != null ? Number(plan.yearlyPrice) : null,
    maxEmployees: plan.maxEmployees,
    maxSites: plan.maxSites,
    maxCaterings: plan.maxCaterings,
    pricingModel: plan.pricingModel,
    commissionPct: plan.commissionPct != null ? Number(plan.commissionPct) : null,
    flatMonthlyFee: plan.flatMonthlyFee != null ? Number(plan.flatMonthlyFee) : null,
    maxCompanies: plan.maxCompanies,
    supportLevel: plan.supportLevel,
    active: plan.active,
    assignedCount:
      plan.planType === 'CATERING'
        ? plan._count.restaurants
        : plan._count.companies,
    // Se excluyen las core (siempre activas, se muestran aparte).
    featureKeys: plan.planFeatures
      .map((f) => f.featureKey)
      .filter((k) => !CORE_FEATURE_KEYS.includes(k)),
  }
}

/** Catálogo de features de un portal, agrupado por categoría (para el selector). */
export function getFeatureCatalogGrouped(portal: PlanPortal = 'EMPRESA') {
  return FEATURE_CATEGORIES.filter((c) => c.portal === portal)
    .map((cat) => ({
      category: cat.key,
      label: cat.label,
      features: FEATURE_CATALOG.filter(
        (f) => f.portal === portal && f.category === cat.key
      ),
    }))
    .filter((g) => g.features.length > 0)
}

/** Planes de catering activos (para el selector de la ficha de catering). */
export async function getCateringPlanOptions() {
  const plans = await prisma.saasPlan.findMany({
    where: { planType: 'CATERING', active: true },
    orderBy: [{ scope: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      pricingModel: true,
      commissionPct: true,
      flatMonthlyFee: true,
    },
  })
  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    pricingModel: p.pricingModel,
    commissionPct: p.commissionPct != null ? Number(p.commissionPct) : null,
    flatMonthlyFee: p.flatMonthlyFee != null ? Number(p.flatMonthlyFee) : null,
  }))
}

export async function getAllSaasPlans() {
  return prisma.saasPlan.findMany({
    orderBy: { monthlyPrice: 'asc' },
  })
}

export async function getSaasPlanStats() {
  const plans = await prisma.saasPlan.findMany()
  const usage = await prisma.company.groupBy({
    by: ['saasPlanId'],
    where: { tenant: { status: 'ACTIVE', deletedAt: null } },
    _count: { _all: true },
  })
  const countById = new Map(usage.map((u) => [u.saasPlanId, u._count._all]))
  return plans.map((p) => ({
    ...p,
    activeCompanies: countById.get(p.id) ?? 0,
    monthlyRevenue: (countById.get(p.id) ?? 0) * Number(p.monthlyPrice),
  }))
}

export async function getAllTaxRules() {
  return prisma.taxRule.findMany({
    orderBy: [{ active: 'desc' }, { rate: 'asc' }],
  })
}

export async function getActiveTaxRuleByCategory(category: string) {
  const now = new Date()
  return prisma.taxRule.findFirst({
    where: {
      category,
      active: true,
      validFrom: { lte: now },
      OR: [{ validTo: null }, { validTo: { gte: now } }],
    },
  })
}
