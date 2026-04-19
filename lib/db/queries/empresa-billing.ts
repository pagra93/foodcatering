/**
 * Queries para /empresa/facturacion — lo que la empresa paga/recibe.
 * 2 flujos:
 * 1. Facturas del catering por los pedidos (Invoice).
 * 2. Facturas SaaS de SinTupper por el plan (SaasInvoice).
 */

import { prisma } from '@/lib/db/prisma'

export async function getEmpresaInvoicesFromCatering(tenantEmpresa: string) {
  const invoices = await prisma.invoice.findMany({
    where: { tenantEmpresa },
    orderBy: { period: 'desc' },
  })

  const cateringIds = [...new Set(invoices.map((i) => i.tenantCatering))]
  const caterings = await prisma.tenant.findMany({
    where: { id: { in: cateringIds } },
    select: { id: true, name: true, subdomain: true },
  })
  const byId = new Map(caterings.map((c) => [c.id, c]))

  return invoices.map((i) => ({
    ...i,
    catering: byId.get(i.tenantCatering) ?? null,
  }))
}

export async function getEmpresaSaasInvoices(tenantEmpresa: string) {
  return prisma.saasInvoice.findMany({
    where: { tenantEmpresa },
    orderBy: { period: 'desc' },
  })
}

export async function getEmpresaBillingKPIs(tenantEmpresa: string) {
  const yearStart = new Date(new Date().getFullYear(), 0, 1)

  const [
    cateringTotalYTD,
    cateringPendingAmount,
    cateringPendingCount,
    saasTotalYTD,
    saasPendingAmount,
    saasPendingCount,
    company,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { tenantEmpresa, createdAt: { gte: yearStart } },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: {
        tenantEmpresa,
        status: { in: ['ISSUED', 'SENT', 'OVERDUE'] },
      },
      _sum: { total: true },
    }),
    prisma.invoice.count({
      where: {
        tenantEmpresa,
        status: { in: ['ISSUED', 'SENT', 'OVERDUE'] },
      },
    }),
    prisma.saasInvoice.aggregate({
      where: { tenantEmpresa, createdAt: { gte: yearStart } },
      _sum: { total: true },
    }),
    prisma.saasInvoice.aggregate({
      where: {
        tenantEmpresa,
        status: { in: ['ISSUED', 'OVERDUE'] },
      },
      _sum: { total: true },
    }),
    prisma.saasInvoice.count({
      where: {
        tenantEmpresa,
        status: { in: ['ISSUED', 'OVERDUE'] },
      },
    }),
    prisma.company.findFirst({
      where: { tenantId: tenantEmpresa },
      select: { plan: true, legalName: true },
    }),
  ])

  const plan = company
    ? await prisma.saasPlan.findUnique({ where: { code: company.plan } })
    : null

  return {
    cateringTotalYTD: Number(cateringTotalYTD._sum.total ?? 0),
    cateringPendingAmount: Number(cateringPendingAmount._sum.total ?? 0),
    cateringPendingCount,
    saasTotalYTD: Number(saasTotalYTD._sum.total ?? 0),
    saasPendingAmount: Number(saasPendingAmount._sum.total ?? 0),
    saasPendingCount,
    currentPlan: plan ? { code: plan.code, name: plan.name, monthlyPrice: Number(plan.monthlyPrice) } : null,
    companyName: company?.legalName ?? null,
  }
}
