/**
 * Queries para la asignación catering ↔ empresa (`CompanyCateringAssignment`),
 * gestionada desde el admin (ficha de empresa). El límite de empresas por
 * catering vive en su plan (`maxCompanies`) — ver lib/plans/entitlements.ts.
 */

import { prisma } from '@/lib/db/prisma'

type PlanPricing = {
  name: string | null
  pricingModel: 'COMMISSION' | 'FIXED' | null
  commissionPct: unknown
  flatMonthlyFee: unknown
} | null

/** Etiqueta legible del cobro de un plan de catering. */
function pricingLabel(plan: PlanPricing): string {
  if (!plan) return 'Sin plan'
  if (plan.pricingModel === 'FIXED') return `${Number(plan.flatMonthlyFee ?? 0).toFixed(0)} €/mes`
  if (plan.pricingModel === 'COMMISSION') return `${(Number(plan.commissionPct ?? 0) * 100).toFixed(1)}%`
  return 'Sin cobro'
}

const PLAN_SELECT = {
  name: true,
  pricingModel: true,
  commissionPct: true,
  flatMonthlyFee: true,
} as const

/** Caterings asignados a una empresa (activos e históricos), con su cobro. */
export async function getCompanyCateringAssignments(companyId: string) {
  const assignments = await prisma.companyCateringAssignment.findMany({
    where: { companyId },
    orderBy: [{ active: 'desc' }, { priority: 'asc' }, { assignedAt: 'desc' }],
  })

  const cateringIds = [...new Set(assignments.map((a) => a.tenantCatering))]
  const tenants = cateringIds.length
    ? await prisma.tenant.findMany({
        where: { id: { in: cateringIds } },
        select: {
          id: true,
          name: true,
          subdomain: true,
          status: true,
          restaurants: { select: { saasPlan: { select: PLAN_SELECT } }, take: 1 },
        },
      })
    : []
  const byId = new Map(tenants.map((t) => [t.id, t]))

  return assignments.map((a) => {
    const t = byId.get(a.tenantCatering)
    const plan = t?.restaurants[0]?.saasPlan ?? null
    return {
      id: a.id,
      tenantCatering: a.tenantCatering,
      cateringName: t?.name ?? '(catering desconocido)',
      cateringSubdomain: t?.subdomain ?? '',
      cateringStatus: t?.status ?? null,
      planName: plan?.name ?? null,
      pricing: pricingLabel(plan),
      type: a.type as 'PRIMARY' | 'BACKUP',
      priority: a.priority,
      active: a.active,
      assignedAt: a.assignedAt,
      deactivatedAt: a.deactivatedAt,
      deactivationReason: a.deactivationReason,
    }
  })
}

export type CompanyCateringAssignmentRow = Awaited<
  ReturnType<typeof getCompanyCateringAssignments>
>[number]

/**
 * Caterings que se pueden asignar a una empresa: activos y **no** ya asignados
 * (activos) a ella. Cada uno con el uso de su plan (empresas servidas vs
 * `maxCompanies`) para mostrar/limitar en la UI.
 */
export async function getAssignableCaterings(companyId: string) {
  const [caterings, activeAssignments, usage] = await Promise.all([
    prisma.tenant.findMany({
      where: { type: 'CATERING', status: 'ACTIVE', deletedAt: null },
      select: {
        id: true,
        name: true,
        subdomain: true,
        restaurants: {
          select: { saasPlan: { select: { ...PLAN_SELECT, maxCompanies: true } } },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.companyCateringAssignment.findMany({
      where: { companyId, active: true },
      select: { tenantCatering: true },
    }),
    prisma.companyCateringAssignment.groupBy({
      by: ['tenantCatering'],
      where: { active: true },
      _count: { _all: true },
    }),
  ])

  const alreadyAssigned = new Set(activeAssignments.map((a) => a.tenantCatering))
  const usedByCatering = new Map(usage.map((u) => [u.tenantCatering, u._count._all]))

  return caterings
    .filter((c) => !alreadyAssigned.has(c.id))
    .map((c) => {
      const plan = c.restaurants[0]?.saasPlan ?? null
      const used = usedByCatering.get(c.id) ?? 0
      const max = plan?.maxCompanies ?? null
      return {
        id: c.id,
        name: c.name,
        subdomain: c.subdomain,
        planName: plan?.name ?? null,
        pricing: pricingLabel(plan),
        companiesUsed: used,
        maxCompanies: max,
        atLimit: max != null && used >= max,
      }
    })
}

export type AssignableCatering = Awaited<
  ReturnType<typeof getAssignableCaterings>
>[number]
