/**
 * Queries para el dashboard de compliance y la auditoría fiscal global.
 */

// F5: panel admin = lecturas cross-tenant a propósito → cliente sin guard.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
import type { Prisma } from '@prisma/client'

export async function getComplianceDashboardKPIs() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    gdprPending,
    gdprNearDue,
    dpasExpiring,
    dpasWithoutAgreement,
    securityPending,
    securityFailed,
    retentionPolicies,
  ] = await Promise.all([
    prisma.gdprRequest.count({
      where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
    }),
    prisma.gdprRequest.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueBy: {
          lte: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.dpaAgreement.count({
      where: {
        effectiveTo: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.tenant.count({
      where: {
        type: { in: ['EMPRESA', 'CATERING'] },
        status: 'ACTIVE',
        deletedAt: null,
      },
    }),
    prisma.securityCheck.count({ where: { status: 'PENDING' } }),
    prisma.securityCheck.count({ where: { status: 'FAILED' } }),
    prisma.retentionPolicy.count(),
  ])

  // Calcula tenants sin DPA vigente (hoy entre effectiveFrom y effectiveTo).
  const now = new Date()
  // groupBy agrega en SQL; `findMany({ distinct })` sin el preview
  // nativeDistinct traería todos los DPAs vigentes a Node para deduplicar.
  const tenantsWithDpa = await prisma.dpaAgreement.groupBy({
    by: ['tenantId'],
    where: {
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
  })
  const withoutDpa = dpasWithoutAgreement - tenantsWithDpa.length

  return {
    gdprPending,
    gdprNearDue,
    dpasExpiring,
    tenantsWithoutDpa: Math.max(0, withoutDpa),
    securityPending,
    securityFailed,
    retentionPoliciesCount: retentionPolicies,
  }
}

export type FiscalAuditFilters = {
  year?: number
  companyId?: string
  page?: number
  pageSize?: number
}

/**
 * Reportes fiscales cross-tenant con nombre de empresa.
 */
export async function getGlobalFiscalReports(filters: FiscalAuditFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25))

  const where: Prisma.FiscalReportWhereInput = {
    ...(filters.year && { periodYear: filters.year }),
  }

  const [reports, total] = await Promise.all([
    prisma.fiscalReport.findMany({
      where,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.fiscalReport.count({ where }),
  ])

  const tenantIds = [...new Set(reports.map((r) => r.tenantEmpresa))]
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true, subdomain: true },
  })
  const nameById = new Map(tenants.map((t) => [t.id, t]))

  return {
    reports: reports.map((r) => ({
      ...r,
      empresa: nameById.get(r.tenantEmpresa) ?? null,
    })),
    total,
    page,
    pageSize,
  }
}

export async function getFiscalAuditKPIs() {
  const thisYear = new Date().getFullYear()
  const reports = await prisma.fiscalReport.findMany({
    where: { periodYear: thisYear },
    select: {
      totalAmount: true,
      deductibleAmount: true,
      nonDeductibleAmount: true,
      ordersAboveLimit: true,
      ordersWithoutProof: true,
      ordersWithIssues: true,
      tenantEmpresa: true,
    },
  })

  const totalAmount = reports.reduce((s, r) => s + Number(r.totalAmount), 0)
  const deductible = reports.reduce((s, r) => s + Number(r.deductibleAmount), 0)
  const nonDeductible = reports.reduce(
    (s, r) => s + Number(r.nonDeductibleAmount),
    0
  )
  const aboveLimit = reports.reduce((s, r) => s + r.ordersAboveLimit, 0)
  const withoutProof = reports.reduce((s, r) => s + r.ordersWithoutProof, 0)
  const withIssues = reports.reduce((s, r) => s + r.ordersWithIssues, 0)

  return {
    totalReports: reports.length,
    distinctEmpresas: new Set(reports.map((r) => r.tenantEmpresa)).size,
    totalAmount,
    deductible,
    nonDeductible,
    deductibilityRate:
      totalAmount === 0 ? 100 : Math.round((deductible / totalAmount) * 1000) / 10,
    aboveLimit,
    withoutProof,
    withIssues,
  }
}
