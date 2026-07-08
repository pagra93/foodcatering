/**
 * Queries globales para el dashboard y páginas de facturación admin.
 * Cross-tenant: el super admin ve todos los flujos de dinero.
 */

// F5: panel admin = lecturas cross-tenant a propósito → cliente sin guard.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
import type {
  InvoiceStatus,
  SettlementStatus,
  SaasInvoiceStatus,
} from '@prisma/client'

/**
 * Estado de cuentas consolidado: los tres flujos de dinero de la plataforma.
 * Por cada flujo: facturado (emitido, sin borradores/anuladas), cobrado (pagado),
 * pendiente (abierto) y vencido (abierto con fecha pasada, derivado al vuelo).
 *  · food       → empresa paga la comida al catering (Invoice)
 *  · commission → catering paga la comisión a Plati (Settlement, sobre netOwed)
 *  · saas       → empresa paga la suscripción a Plati (SaasInvoice)
 */
export async function getAccountsOverview() {
  const now = new Date()
  const invoiceOpen: InvoiceStatus[] = ['ISSUED', 'SENT', 'OVERDUE']
  const invoiceBilled: InvoiceStatus[] = ['ISSUED', 'SENT', 'PAID', 'OVERDUE']
  const settleOpen: SettlementStatus[] = ['ISSUED', 'OVERDUE']
  const settleBilled: SettlementStatus[] = ['ISSUED', 'PAID', 'OVERDUE']
  const saasOpen: SaasInvoiceStatus[] = ['ISSUED', 'OVERDUE']
  const saasBilled: SaasInvoiceStatus[] = ['ISSUED', 'PAID', 'OVERDUE']

  const [
    invBilled,
    invPaid,
    invPending,
    invOverdue,
    setBilled,
    setPaid,
    setPending,
    setOverdue,
    saasBilledAgg,
    saasPaid,
    saasPending,
    saasOverdue,
  ] = await Promise.all([
    prisma.invoice.aggregate({ where: { status: { in: invoiceBilled } }, _sum: { total: true } }),
    prisma.invoice.aggregate({ where: { status: 'PAID' }, _sum: { total: true } }),
    prisma.invoice.aggregate({ where: { status: { in: invoiceOpen } }, _sum: { total: true } }),
    prisma.invoice.aggregate({ where: { status: { in: invoiceOpen }, dueDate: { lt: now } }, _sum: { total: true } }),
    prisma.settlement.aggregate({ where: { status: { in: settleBilled } }, _sum: { netOwed: true } }),
    prisma.settlement.aggregate({ where: { status: 'PAID' }, _sum: { netOwed: true } }),
    prisma.settlement.aggregate({ where: { status: { in: settleOpen } }, _sum: { netOwed: true } }),
    prisma.settlement.aggregate({ where: { status: { in: settleOpen }, dueBy: { lt: now } }, _sum: { netOwed: true } }),
    prisma.saasInvoice.aggregate({ where: { status: { in: saasBilled } }, _sum: { total: true } }),
    prisma.saasInvoice.aggregate({ where: { status: 'PAID' }, _sum: { total: true } }),
    prisma.saasInvoice.aggregate({ where: { status: { in: saasOpen } }, _sum: { total: true } }),
    prisma.saasInvoice.aggregate({ where: { status: { in: saasOpen }, dueBy: { lt: now } }, _sum: { total: true } }),
  ])

  return {
    food: {
      billed: Number(invBilled._sum.total ?? 0),
      paid: Number(invPaid._sum.total ?? 0),
      pending: Number(invPending._sum.total ?? 0),
      overdue: Number(invOverdue._sum.total ?? 0),
    },
    commission: {
      billed: Number(setBilled._sum.netOwed ?? 0),
      paid: Number(setPaid._sum.netOwed ?? 0),
      pending: Number(setPending._sum.netOwed ?? 0),
      overdue: Number(setOverdue._sum.netOwed ?? 0),
    },
    saas: {
      billed: Number(saasBilledAgg._sum.total ?? 0),
      paid: Number(saasPaid._sum.total ?? 0),
      pending: Number(saasPending._sum.total ?? 0),
      overdue: Number(saasOverdue._sum.total ?? 0),
    },
  }
}

export type AccountsOverview = Awaited<ReturnType<typeof getAccountsOverview>>

/**
 * KPIs principales del dashboard /admin/billing.
 */
export async function getBillingDashboardKPIs() {
  const now = new Date()
  // YTD por PERÍODO (año del period "YYYY-MM"), no por createdAt: así una
  // liquidación de diciembre generada en enero cuenta en su ejercicio, no en el
  // siguiente, y el YTD cuadra con la suma de los meses de las series.
  const yearPrefix = `${now.getFullYear()}-`
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
      where: { period: { startsWith: yearPrefix } },
      _sum: { commissionAmount: true },
    }),
    prisma.settlement.aggregate({
      where: { period: { startsWith: yearPrefix }, status: 'PAID' },
      _sum: { commissionAmount: true },
    }),
    prisma.saasInvoice.aggregate({
      where: { period: { startsWith: yearPrefix } },
      _sum: { total: true },
    }),
    prisma.saasInvoice.aggregate({
      where: { period: { startsWith: yearPrefix }, status: 'PAID' },
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

  // MRR (neto, sin IVA): por cada empresa activa, el precio mensual-equivalente de
  // su plan. Solo planes de EMPRESA activos; los anuales se normalizan a
  // yearlyPrice/12 cuando no tienen mensual. Excluye planes de catering/inactivos.
  const plans = await prisma.saasPlan.findMany({
    where: { planType: 'EMPRESA', active: true },
    select: { id: true, monthlyPrice: true, yearlyPrice: true },
  })
  const monthlyEquivById = new Map(
    plans.map((p) => {
      const monthly = Number(p.monthlyPrice)
      const equiv =
        monthly > 0 ? monthly : p.yearlyPrice ? Number(p.yearlyPrice) / 12 : 0
      return [p.id, equiv]
    })
  )
  const companiesByPlan = await prisma.company.groupBy({
    by: ['saasPlanId'],
    where: { tenant: { status: 'ACTIVE', deletedAt: null } },
    _count: { _all: true },
  })
  let mrrSaas = 0
  for (const row of companiesByPlan) {
    const price = row.saasPlanId ? monthlyEquivById.get(row.saasPlanId) ?? 0 : 0
    mrrSaas += price * row._count._all
  }
  mrrSaas = Math.round(mrrSaas * 100) / 100

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
  // SaaS en NETO (subtotal, sin IVA) para que ambas barras sean comparables con
  // las comisiones (que ya son netas).
  const saas = await prisma.saasInvoice.groupBy({
    by: ['period'],
    where: { period: { in: months } },
    _sum: { subtotal: true },
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
    saas: Number(saasByPeriod.get(period)?.subtotal ?? 0),
  }))
}
