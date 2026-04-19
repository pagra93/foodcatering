/**
 * Queries CRUD sobre SaasInvoice (SinTupper → Empresa por plan SaaS).
 */

import { prisma } from '@/lib/db/prisma'
import type { Prisma, SaasInvoiceStatus } from '@prisma/client'

export type SaasInvoiceFilters = {
  status?: SaasInvoiceStatus
  period?: string
  tenantEmpresa?: string
  page?: number
  pageSize?: number
}

export async function getSaasInvoices(filters: SaasInvoiceFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25))

  const where: Prisma.SaasInvoiceWhereInput = {
    ...(filters.status && { status: filters.status }),
    ...(filters.period && { period: filters.period }),
    ...(filters.tenantEmpresa && { tenantEmpresa: filters.tenantEmpresa }),
  }

  const [invoices, total] = await Promise.all([
    prisma.saasInvoice.findMany({
      where,
      orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.saasInvoice.count({ where }),
  ])

  const tenantIds = [...new Set(invoices.map((i) => i.tenantEmpresa))]
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true, subdomain: true },
  })
  const byId = new Map(tenants.map((t) => [t.id, t]))

  return {
    invoices: invoices.map((i) => ({
      ...i,
      empresa: byId.get(i.tenantEmpresa) ?? null,
    })),
    total,
    page,
    pageSize,
  }
}

export async function getSaasInvoicesKPIs() {
  const [draft, issued, paid, overdue, sumPending] = await Promise.all([
    prisma.saasInvoice.count({ where: { status: 'DRAFT' } }),
    prisma.saasInvoice.count({ where: { status: 'ISSUED' } }),
    prisma.saasInvoice.count({ where: { status: 'PAID' } }),
    prisma.saasInvoice.count({ where: { status: 'OVERDUE' } }),
    prisma.saasInvoice.aggregate({
      where: { status: { in: ['ISSUED', 'OVERDUE'] } },
      _sum: { total: true },
    }),
  ])
  return {
    draft,
    issued,
    paid,
    overdue,
    pendingAmount: Number(sumPending._sum.total ?? 0),
  }
}

export async function getSaasInvoicesForEmpresa(tenantEmpresa: string) {
  return prisma.saasInvoice.findMany({
    where: { tenantEmpresa },
    orderBy: { period: 'desc' },
  })
}

export async function getSaasInvoiceById(id: string) {
  const inv = await prisma.saasInvoice.findUnique({ where: { id } })
  if (!inv) return null
  const empresa = await prisma.tenant.findUnique({
    where: { id: inv.tenantEmpresa },
    select: { id: true, name: true, subdomain: true },
  })
  return { ...inv, empresa }
}
