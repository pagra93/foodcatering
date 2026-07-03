/**
 * Queries para catálogo de planes SaaS y reglas fiscales.
 */

import { prisma } from '@/lib/db/prisma'

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
