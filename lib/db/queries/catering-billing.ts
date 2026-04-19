/**
 * Queries para /catering/facturacion. El catering tiene 2 roles:
 * 1. Emisor hacia empresas (facturas Invoice).
 * 2. Pagador a SinTupper (liquidaciones Settlement).
 */

import { prisma } from '@/lib/db/prisma'

export async function getCateringInvoicesEmitidas(tenantCatering: string) {
  const invoices = await prisma.invoice.findMany({
    where: { tenantCatering },
    orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
  })

  const empresaIds = [...new Set(invoices.map((i) => i.tenantEmpresa))]
  const empresas = await prisma.tenant.findMany({
    where: { id: { in: empresaIds } },
    select: { id: true, name: true, subdomain: true },
  })
  const byId = new Map(empresas.map((t) => [t.id, t]))

  return invoices.map((i) => ({
    ...i,
    empresa: byId.get(i.tenantEmpresa) ?? null,
  }))
}

export async function getCateringBillingKPIs(tenantCatering: string) {
  const yearStart = new Date(new Date().getFullYear(), 0, 1)

  const [
    emitidasTotalYTD,
    emitidasPaidYTD,
    pendingCobrarAmount,
    pendingCobrarCount,
    settlementsTotalYTD,
    settlementsPaidYTD,
    pendingPagarAmount,
    pendingPagarCount,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { tenantCatering, createdAt: { gte: yearStart } },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: {
        tenantCatering,
        createdAt: { gte: yearStart },
        status: 'PAID',
      },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: {
        tenantCatering,
        status: { in: ['ISSUED', 'SENT', 'OVERDUE'] },
      },
      _sum: { total: true },
    }),
    prisma.invoice.count({
      where: {
        tenantCatering,
        status: { in: ['ISSUED', 'SENT', 'OVERDUE'] },
      },
    }),
    prisma.settlement.aggregate({
      where: { tenantCatering, createdAt: { gte: yearStart } },
      _sum: { netOwed: true, commissionAmount: true },
    }),
    prisma.settlement.aggregate({
      where: {
        tenantCatering,
        createdAt: { gte: yearStart },
        status: 'PAID',
      },
      _sum: { netOwed: true },
    }),
    prisma.settlement.aggregate({
      where: {
        tenantCatering,
        status: { in: ['ISSUED', 'OVERDUE'] },
      },
      _sum: { netOwed: true },
    }),
    prisma.settlement.count({
      where: {
        tenantCatering,
        status: { in: ['ISSUED', 'OVERDUE'] },
      },
    }),
  ])

  return {
    emitidasTotalYTD: Number(emitidasTotalYTD._sum.total ?? 0),
    emitidasPaidYTD: Number(emitidasPaidYTD._sum.total ?? 0),
    pendingCobrarAmount: Number(pendingCobrarAmount._sum.total ?? 0),
    pendingCobrarCount,
    settlementsTotalYTD: Number(settlementsTotalYTD._sum.netOwed ?? 0),
    settlementsPaidYTD: Number(settlementsPaidYTD._sum.netOwed ?? 0),
    pendingPagarAmount: Number(pendingPagarAmount._sum.netOwed ?? 0),
    pendingPagarCount,
    commissionsYTD: Number(settlementsTotalYTD._sum.commissionAmount ?? 0),
  }
}
