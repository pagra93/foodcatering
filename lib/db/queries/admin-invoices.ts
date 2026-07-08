/**
 * Queries cross-tenant sobre Invoice (factura de comida catering → empresa).
 * Para el admin (Plati): ve TODAS las facturas, sin filtro de tenant, con
 * filtros opcionales. Molde de admin-settlements.ts / admin-saas-invoices.ts.
 */

// F5: panel admin = lecturas cross-tenant a propósito → cliente sin guard.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
import type { InvoiceStatus, Prisma } from '@prisma/client'

export type AdminInvoiceFilters = {
  status?: InvoiceStatus
  period?: string
  tenantCatering?: string
  tenantEmpresa?: string
  page?: number
  pageSize?: number
}

export async function getAdminInvoices(filters: AdminInvoiceFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25))

  const where: Prisma.InvoiceWhereInput = {
    ...(filters.status && { status: filters.status }),
    ...(filters.period && { period: filters.period }),
    ...(filters.tenantCatering && { tenantCatering: filters.tenantCatering }),
    ...(filters.tenantEmpresa && { tenantEmpresa: filters.tenantEmpresa }),
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ])

  // Resolver nombres de catering (tenantCatering) y empresa (tenantEmpresa).
  const tenantIds = [
    ...new Set(invoices.flatMap((i) => [i.tenantCatering, i.tenantEmpresa])),
  ]
  const tenants = tenantIds.length
    ? await prisma.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true, subdomain: true },
      })
    : []
  const byId = new Map(tenants.map((t) => [t.id, t]))

  return {
    invoices: invoices.map((i) => ({
      ...i,
      subtotal: Number(i.subtotal),
      taxAmount: Number(i.taxAmount),
      total: Number(i.total),
      catering: byId.get(i.tenantCatering) ?? null,
      empresa: byId.get(i.tenantEmpresa) ?? null,
    })),
    total,
    page,
    pageSize,
  }
}

/**
 * KPIs de las facturas de comida (cross-tenant). "Vencida" derivada por fecha
 * (dueDate < ahora sobre facturas abiertas), como en liquidaciones/SaaS.
 */
export async function getAdminInvoicesKPIs() {
  const now = new Date()
  const openStatuses: InvoiceStatus[] = ['ISSUED', 'SENT', 'OVERDUE']
  const open = { status: { in: openStatuses } }
  const [issued, overdue, paid, totalBilled, sumPending] = await Promise.all([
    prisma.invoice.count({
      where: { ...open, dueDate: { gte: now } },
    }),
    prisma.invoice.count({
      where: { ...open, dueDate: { lt: now } },
    }),
    prisma.invoice.count({ where: { status: 'PAID' } }),
    prisma.invoice.aggregate({
      where: { status: { notIn: ['DRAFT', 'CANCELLED', 'VOID'] } },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({ where: open, _sum: { total: true } }),
  ])
  return {
    issued,
    overdue,
    paid,
    totalBilled: Number(totalBilled._sum.total ?? 0),
    pendingAmount: Number(sumPending._sum.total ?? 0),
  }
}

/** Caterings y empresas activos, para poblar los filtros de la vista admin. */
export async function getInvoiceFilterOptions() {
  const [caterings, empresas] = await Promise.all([
    prisma.tenant.findMany({
      where: { type: 'CATERING', deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.tenant.findMany({
      where: { type: 'EMPRESA', deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  return { caterings, empresas }
}
