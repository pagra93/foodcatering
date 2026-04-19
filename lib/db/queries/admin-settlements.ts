/**
 * Queries CRUD sobre Settlement (comisión Catering → SinTupper).
 */

import { prisma } from '@/lib/db/prisma'
import type { SettlementStatus, Prisma } from '@prisma/client'

export type SettlementFilters = {
  status?: SettlementStatus
  period?: string
  tenantCatering?: string
  page?: number
  pageSize?: number
}

export async function getSettlements(filters: SettlementFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25))

  const where: Prisma.SettlementWhereInput = {
    ...(filters.status && { status: filters.status }),
    ...(filters.period && { period: filters.period }),
    ...(filters.tenantCatering && { tenantCatering: filters.tenantCatering }),
  }

  const [settlements, total] = await Promise.all([
    prisma.settlement.findMany({
      where,
      orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.settlement.count({ where }),
  ])

  const cateringIds = [...new Set(settlements.map((s) => s.tenantCatering))]
  const caterings = await prisma.tenant.findMany({
    where: { id: { in: cateringIds } },
    select: { id: true, name: true, subdomain: true },
  })
  const byId = new Map(caterings.map((c) => [c.id, c]))

  return {
    settlements: settlements.map((s) => ({
      ...s,
      catering: byId.get(s.tenantCatering) ?? null,
    })),
    total,
    page,
    pageSize,
  }
}

export async function getSettlementsKPIs() {
  const [draft, issued, paid, overdue, sumPending] = await Promise.all([
    prisma.settlement.count({ where: { status: 'DRAFT' } }),
    prisma.settlement.count({ where: { status: 'ISSUED' } }),
    prisma.settlement.count({ where: { status: 'PAID' } }),
    prisma.settlement.count({ where: { status: 'OVERDUE' } }),
    prisma.settlement.aggregate({
      where: { status: { in: ['ISSUED', 'OVERDUE'] } },
      _sum: { netOwed: true },
    }),
  ])
  return {
    draft,
    issued,
    paid,
    overdue,
    pendingAmount: Number(sumPending._sum.netOwed ?? 0),
  }
}

export async function getSettlementsForCatering(tenantCatering: string) {
  return prisma.settlement.findMany({
    where: { tenantCatering },
    orderBy: { period: 'desc' },
  })
}

export async function getSettlementById(id: string) {
  const s = await prisma.settlement.findUnique({ where: { id } })
  if (!s) return null
  const catering = await prisma.tenant.findUnique({
    where: { id: s.tenantCatering },
    select: { id: true, name: true, subdomain: true },
  })
  return { ...s, catering }
}
