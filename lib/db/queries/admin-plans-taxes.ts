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
    by: ['plan'],
    where: { tenant: { status: 'ACTIVE', deletedAt: null } },
    _count: { _all: true },
  })
  const countByPlan = new Map(usage.map((u) => [u.plan, u._count._all]))
  return plans.map((p) => ({
    ...p,
    activeCompanies: countByPlan.get(p.code) ?? 0,
    monthlyRevenue:
      (countByPlan.get(p.code) ?? 0) * Number(p.monthlyPrice),
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
