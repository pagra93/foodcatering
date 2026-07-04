/**
 * Queries CRUD sobre Settlement (comisión Catering → Plati).
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
  // "Vencida" se deriva por fecha (dueBy < ahora): una liquidación abierta
  // (ISSUED/OVERDUE) cuyo vencimiento pasó cuenta como vencida; el resto, al día.
  const now = new Date()
  const openStatuses: SettlementStatus[] = ['ISSUED', 'OVERDUE']
  const open = { status: { in: openStatuses } }
  const [draft, issuedCurrent, overdue, paid, sumPending] = await Promise.all([
    prisma.settlement.count({ where: { status: 'DRAFT' } }),
    prisma.settlement.count({
      where: { ...open, OR: [{ dueBy: null }, { dueBy: { gte: now } }] },
    }),
    prisma.settlement.count({ where: { ...open, dueBy: { lt: now } } }),
    prisma.settlement.count({ where: { status: 'PAID' } }),
    prisma.settlement.aggregate({ where: open, _sum: { netOwed: true } }),
  ])
  return {
    draft,
    issued: issuedCurrent,
    paid,
    overdue,
    pendingAmount: Number(sumPending._sum.netOwed ?? 0),
  }
}

/**
 * Comisiones agregadas por catering (vista "Por catering" de Liquidaciones).
 * Es un GROUP BY sobre los mismos Settlement — no hay entidad "comisión" aparte.
 */
export async function getCommissionsByCatering() {
  const { settlements } = await getSettlements({ pageSize: 500 })

  const byId = new Map<
    string,
    {
      name: string
      subdomain: string | null
      totalCommission: number
      paidCommission: number
      pendingCommission: number
      totalGross: number
      count: number
    }
  >()

  for (const s of settlements) {
    const id = s.tenantCatering
    const entry =
      byId.get(id) ?? {
        name: s.catering?.name ?? '—',
        subdomain: s.catering?.subdomain ?? null,
        totalCommission: 0,
        paidCommission: 0,
        pendingCommission: 0,
        totalGross: 0,
        count: 0,
      }
    const amount = Number(s.commissionAmount)
    entry.totalCommission += amount
    entry.totalGross += Number(s.grossAmount)
    if (s.status === 'PAID') entry.paidCommission += amount
    else if (s.status === 'ISSUED' || s.status === 'OVERDUE')
      entry.pendingCommission += amount
    entry.count += 1
    byId.set(id, entry)
  }

  return [...byId.entries()]
    .map(([tenantCatering, v]) => ({ tenantCatering, ...v }))
    .sort((a, b) => b.totalCommission - a.totalCommission)
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
