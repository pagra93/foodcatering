/**
 * Queries para catálogo de planes SaaS y reglas fiscales.
 */

import { prisma } from '@/lib/db/prisma'
import {
  FEATURE_CATALOG,
  FEATURE_CATEGORIES,
  CORE_FEATURE_KEYS,
} from '@/lib/plans/feature-catalog'

/** Planes + nº de features y de empresas (para la lista de gestión). */
export async function getPlansWithCounts() {
  const plans = await prisma.saasPlan.findMany({
    orderBy: [{ scope: 'asc' }, { monthlyPrice: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      scope: true,
      tenantEmpresa: true,
      monthlyPrice: true,
      yearlyPrice: true,
      maxEmployees: true,
      maxSites: true,
      maxCaterings: true,
      supportLevel: true,
      active: true,
      _count: { select: { planFeatures: true, companies: true } },
    },
  })
  return plans.map((p) => ({
    ...p,
    monthlyPrice: Number(p.monthlyPrice),
    yearlyPrice: p.yearlyPrice != null ? Number(p.yearlyPrice) : null,
    featuresCount: p._count.planFeatures,
    companiesCount: p._count.companies,
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
      scope: true,
      tenantEmpresa: true,
      monthlyPrice: true,
      yearlyPrice: true,
      maxEmployees: true,
      maxSites: true,
      maxCaterings: true,
      supportLevel: true,
      active: true,
      planFeatures: { select: { featureKey: true } },
      _count: { select: { companies: true } },
    },
  })
  if (!plan) return null
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    scope: plan.scope,
    tenantEmpresa: plan.tenantEmpresa,
    monthlyPrice: Number(plan.monthlyPrice),
    yearlyPrice: plan.yearlyPrice != null ? Number(plan.yearlyPrice) : null,
    maxEmployees: plan.maxEmployees,
    maxSites: plan.maxSites,
    maxCaterings: plan.maxCaterings,
    supportLevel: plan.supportLevel,
    active: plan.active,
    companiesCount: plan._count.companies,
    // Se excluyen las core (siempre activas, se muestran aparte).
    featureKeys: plan.planFeatures
      .map((f) => f.featureKey)
      .filter((k) => !CORE_FEATURE_KEYS.includes(k)),
  }
}

/** Catálogo de features agrupado por categoría (estático, para el selector). */
export function getFeatureCatalogGrouped() {
  return FEATURE_CATEGORIES.map((cat) => ({
    category: cat.key,
    label: cat.label,
    features: FEATURE_CATALOG.filter((f) => f.category === cat.key),
  })).filter((g) => g.features.length > 0)
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
