/**
 * Queries globales para el dashboard y páginas de facturación admin.
 * Cross-tenant: el super admin ve todos los flujos de dinero.
 */

import { prisma } from '@/lib/db/prisma'

/**
 * KPIs principales del dashboard /admin/billing.
 */
export async function getBillingDashboardKPIs() {
  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

  const [
    settlementsYTD,
    settlementsPaidYTD,
    saasInvoicesYTD,
    saasInvoicesPaidYTD,
    settlementsPending,
    saasInvoicesPending,
    settlementsThisMonth,
    settlementsLastMonth,
    activeCompanies,
  ] = await Promise.all([
    prisma.settlement.aggregate({
      where: { createdAt: { gte: yearStart } },
      _sum: { commissionAmount: true },
    }),
    prisma.settlement.aggregate({
      where: { createdAt: { gte: yearStart }, status: 'PAID' },
      _sum: { commissionAmount: true },
    }),
    prisma.saasInvoice.aggregate({
      where: { createdAt: { gte: yearStart } },
      _sum: { total: true },
    }),
    prisma.saasInvoice.aggregate({
      where: { createdAt: { gte: yearStart }, status: 'PAID' },
      _sum: { total: true },
    }),
    prisma.settlement.count({
      where: { status: { in: ['ISSUED', 'OVERDUE'] } },
    }),
    prisma.saasInvoice.count({
      where: { status: { in: ['ISSUED', 'OVERDUE'] } },
    }),
    prisma.settlement.aggregate({
      where: { period: thisMonth },
      _sum: { commissionAmount: true, grossAmount: true },
    }),
    prisma.settlement.aggregate({
      where: { period: lastMonth },
      _sum: { commissionAmount: true, grossAmount: true },
    }),
    prisma.company.count({
      where: { tenant: { status: 'ACTIVE', deletedAt: null } },
    }),
  ])

  // MRR estimado: sumar SaasPlan.monthlyPrice de todas las companies activas por plan.
  const plans = await prisma.saasPlan.findMany({
    where: { active: true },
  })
  const planPriceByCode = new Map(
    plans.map((p) => [p.code, Number(p.monthlyPrice)])
  )
  const companiesByPlan = await prisma.company.groupBy({
    by: ['plan'],
    where: { tenant: { status: 'ACTIVE', deletedAt: null } },
    _count: { _all: true },
  })
  let mrrSaas = 0
  for (const row of companiesByPlan) {
    const price = planPriceByCode.get(row.plan) ?? 0
    mrrSaas += price * row._count._all
  }

  return {
    commissionsYTD: Number(settlementsYTD._sum.commissionAmount ?? 0),
    commissionsPaidYTD: Number(settlementsPaidYTD._sum.commissionAmount ?? 0),
    saasYTD: Number(saasInvoicesYTD._sum.total ?? 0),
    saasPaidYTD: Number(saasInvoicesPaidYTD._sum.total ?? 0),
    pendingCount: settlementsPending + saasInvoicesPending,
    grossThisMonth: Number(settlementsThisMonth._sum.grossAmount ?? 0),
    grossLastMonth: Number(settlementsLastMonth._sum.grossAmount ?? 0),
    mrrSaas,
    arrSaas: mrrSaas * 12,
    activeCompanies,
  }
}

/**
 * Series mensuales de los últimos 12 meses para gráficas MRR/comisiones.
 */
export async function getBillingMonthlySeries() {
  const months: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const settlements = await prisma.settlement.groupBy({
    by: ['period'],
    where: { period: { in: months } },
    _sum: { commissionAmount: true, grossAmount: true },
  })
  const saas = await prisma.saasInvoice.groupBy({
    by: ['period'],
    where: { period: { in: months } },
    _sum: { total: true },
  })

  const settlementsByPeriod = new Map(
    settlements.map((s) => [s.period, s._sum])
  )
  const saasByPeriod = new Map(saas.map((s) => [s.period, s._sum]))

  return months.map((period) => ({
    period,
    commissions: Number(
      settlementsByPeriod.get(period)?.commissionAmount ?? 0
    ),
    gross: Number(settlementsByPeriod.get(period)?.grossAmount ?? 0),
    saas: Number(saasByPeriod.get(period)?.total ?? 0),
  }))
}
