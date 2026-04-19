/**
 * Queries para /admin/quality/penalties.
 * Scope: SUPER_ADMIN ve TODAS las penalizaciones cross-tenant.
 */

import { prisma } from '@/lib/db/prisma'
import type { PenaltyStatus, PenaltyType, Prisma } from '@prisma/client'

export type PenaltyFilters = {
  search?: string
  tenantCatering?: string
  type?: PenaltyType
  status?: PenaltyStatus
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
}

export async function getPenalties(filters: PenaltyFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25))

  const where: Prisma.PenaltyWhereInput = {
    ...(filters.tenantCatering && { tenantCatering: filters.tenantCatering }),
    ...(filters.type && { type: filters.type }),
    ...(filters.status && { status: filters.status }),
    ...(filters.from && {
      appliedAt: { gte: filters.from, ...(filters.to && { lte: filters.to }) },
    }),
    ...(filters.search && {
      OR: [
        { reason: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ],
    }),
  }

  const [penalties, total] = await Promise.all([
    prisma.penalty.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.penalty.count({ where }),
  ])

  // Enriquecer con nombre del catering (hacemos un solo fetch al final).
  const cateringIds = [...new Set(penalties.map((p) => p.tenantCatering))]
  const caterings = await prisma.tenant.findMany({
    where: { id: { in: cateringIds } },
    select: { id: true, name: true, subdomain: true },
  })
  const cateringById = new Map(caterings.map((c) => [c.id, c]))

  return {
    penalties: penalties.map((p) => ({
      ...p,
      catering: cateringById.get(p.tenantCatering) ?? null,
    })),
    total,
    page,
    pageSize,
  }
}

export async function getPenaltyById(id: string) {
  const penalty = await prisma.penalty.findUnique({ where: { id } })
  if (!penalty) return null
  const catering = await prisma.tenant.findUnique({
    where: { id: penalty.tenantCatering },
    select: { id: true, name: true, subdomain: true },
  })
  return { ...penalty, catering }
}

export async function getPenaltiesKPIs() {
  const [pending, applied, disputed, waived, totalPendingAmount] =
    await Promise.all([
      prisma.penalty.count({ where: { status: 'PENDING' } }),
      prisma.penalty.count({ where: { status: 'APPLIED' } }),
      prisma.penalty.count({ where: { status: 'DISPUTED' } }),
      prisma.penalty.count({ where: { status: 'WAIVED' } }),
      prisma.penalty.aggregate({
        where: { status: { in: ['PENDING', 'APPLIED'] } },
        _sum: { amount: true },
      }),
    ])
  return {
    pending,
    applied,
    disputed,
    waived,
    totalPendingAmount: totalPendingAmount._sum.amount ?? 0,
  }
}
