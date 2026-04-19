/**
 * Queries para Auditoría Fiscal en Portal Empresa
 * ♻️ REUTILIZA tablas FiscalReport y DeliveryProof ya existentes
 */

import { prisma } from '@/lib/db/prisma'
import { endOfMonth } from 'date-fns'
import crypto from 'crypto'
import { getEffectiveHolidays } from '@/lib/db/queries/catalogs'

// ============================================================================
// OBTENER O GENERAR REPORTE FISCAL MENSUAL
// ============================================================================

export async function getOrGenerateFiscalReport(
  tenantEmpresa: string,
  year: number,
  month: number
) {
  // Buscar reporte existente
  let report = await prisma.fiscalReport.findFirst({
    where: {
      tenantEmpresa,
      periodYear: year,
      periodMonth: month,
    },
  })

  // Si no existe, generarlo
  if (!report) {
    report = await generateFiscalReport(tenantEmpresa, year, month)
  }

  return report
}

// ============================================================================
// GENERAR REPORTE FISCAL
// ============================================================================

async function generateFiscalReport(
  tenantEmpresa: string,
  year: number,
  month: number
) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)

  // Obtener todos los pedidos del período + festivos efectivos para esta empresa
  const [orders, effectiveHolidays] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantEmpresa,
        serviceDate: { gte: startDate, lte: endDate },
        status: 'DELIVERED',
      },
      include: {
        deliveryProof: true,
      },
    }),
    getEffectiveHolidays(tenantEmpresa, year),
  ])

  // Set de ISO strings (yyyy-MM-dd en UTC) para lookup O(1).
  const holidaysSet = new Set(
    effectiveHolidays.map((h) =>
      new Date(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate()))
        .toISOString()
        .slice(0, 10)
    )
  )

  const isBusinessDayLocal = (d: Date): boolean => {
    const day = d.getDay()
    if (day === 0 || day === 6) return false
    const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      .toISOString()
      .slice(0, 10)
    return !holidaysSet.has(iso)
  }

  // Calcular totales
  const totalOrders = orders.length
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.price), 0)

  // Calcular deducibilidad (≤11€ según Art. 45 RIRPF)
  const deductibleOrders = orders.filter((o) => Number(o.price) <= 11)
  const deductibleAmount = deductibleOrders.reduce(
    (sum, o) => sum + Number(o.price),
    0
  )

  // Validar trazabilidad
  const ordersWithProof = orders.filter((o) => o.deliveryProof !== null).length
  const ordersWithoutProof = totalOrders - ordersWithProof

  // Días hábiles con servicio (excluye fin de semana + festivos efectivos)
  const businessDaysSet = new Set<string>()
  let ordersOnNonBusinessDay = 0
  for (const o of orders) {
    const d = o.serviceDate
    const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      .toISOString()
      .slice(0, 10)
    if (isBusinessDayLocal(d)) {
      businessDaysSet.add(iso)
    } else {
      ordersOnNonBusinessDay++
    }
  }
  const daysWithService = businessDaysSet.size

  // Agrupar por empleado
  const byEmployee = orders.reduce((acc, order) => {
    const empId = order.employeeId
    if (!acc[empId]) {
      acc[empId] = {
        employeeId: empId,
        orders: 0,
        amount: 0,
        deductible: 0,
      }
    }
    acc[empId].orders++
    acc[empId].amount += Number(order.price)
    if (Number(order.price) <= 11) {
      acc[empId].deductible += Number(order.price)
    }
    return acc
  }, {} as Record<string, any>)

  // Crear objeto de datos para firma
  const reportData = {
    period: { year, month },
    summary: {
      totalOrders,
      totalAmount,
      deductibleAmount,
      deductiblePercentage:
        totalAmount > 0 ? (deductibleAmount / totalAmount) * 100 : 0,
      ordersWithProof,
      ordersWithoutProof,
      daysWithService,
      ordersOnNonBusinessDay,
    },
    byEmployee: Object.values(byEmployee),
  }

  // Generar hash de integridad (SHA-256)
  const signatureHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(reportData))
    .digest('hex')

  // Crear reporte en BD
  const report = await prisma.fiscalReport.create({
    data: {
      tenantEmpresa,
      periodYear: year,
      periodMonth: month,
      totalOrders,
      totalAmount,
      deductibleAmount,
      nonDeductibleAmount: totalAmount - deductibleAmount,
      deductibilityRate:
        totalAmount > 0 ? (deductibleAmount / totalAmount) * 100 : 0,
      employeesServed: Object.keys(byEmployee).length,
      daysWithService,
      ordersAboveLimit: orders.filter((o) => Number(o.price) > 11).length,
      ordersWithoutProof,
      ordersWithIssues: ordersOnNonBusinessDay,
      signatureHash,
      generatedBy: 'system', // Placeholder - usar userId real
    },
  })

  return report
}

// ============================================================================
// OBTENER RESUMEN ANUAL
// ============================================================================

export async function getAnnualFiscalSummary(tenantEmpresa: string, year: number) {
  // Obtener todos los reportes del año
  const reports = await prisma.fiscalReport.findMany({
    where: {
      tenantEmpresa,
      periodYear: year,
    },
    orderBy: { periodMonth: 'asc' },
  })

  // Calcular totales anuales
  const totalOrders = reports.reduce((sum, r) => sum + r.totalOrders, 0)
  const totalAmount = reports.reduce(
    (sum, r) => sum + Number(r.totalAmount),
    0
  )
  const deductibleAmount = reports.reduce(
    (sum, r) => sum + Number(r.deductibleAmount),
    0
  )

  const deductiblePercentage =
    totalAmount > 0 ? (deductibleAmount / totalAmount) * 100 : 0

  return {
    year,
    totalOrders,
    totalAmount,
    deductibleAmount,
    deductiblePercentage,
    monthlyReports: reports.map((r) => ({
      month: r.periodMonth,
      orders: r.totalOrders,
      amount: Number(r.totalAmount),
      deductible: Number(r.deductibleAmount),
    })),
  }
}

// ============================================================================
// VERIFICAR CUMPLIMIENTO FISCAL
// ============================================================================

export async function checkFiscalCompliance(
  tenantEmpresa: string,
  companyId: string,
  year: number,
  month: number
) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)

  const [orders, policy] = await Promise.all([
    // Pedidos del período
    prisma.order.findMany({
      where: {
        tenantEmpresa,
        serviceDate: { gte: startDate, lte: endDate },
        status: 'DELIVERED',
      },
      include: {
        deliveryProof: true,
      },
    }),

    // Política de la empresa
    prisma.companyPolicy.findUnique({
      where: { companyId },
      select: { limitPerDay: true },
    }),
  ])

  // Validaciones
  const issues = []

  // 1. Pedidos sin delivery proof
  const withoutProof = orders.filter((o) => !o.deliveryProof).length
  if (withoutProof > 0) {
    issues.push({
      type: 'NO_PROOF',
      severity: 'HIGH',
      count: withoutProof,
      message: `${withoutProof} pedidos sin justificante de entrega`,
    })
  }

  // 2. Pedidos que exceden límite de 11€ (Art. 45 RIRPF)
  const exceedLimit = orders.filter((o) => Number(o.price) > 11).length
  if (exceedLimit > 0) {
    issues.push({
      type: 'EXCEEDS_FISCAL_LIMIT',
      severity: 'MEDIUM',
      count: exceedLimit,
      message: `${exceedLimit} pedidos exceden límite fiscal de 11€`,
    })
  }

  // 3. Pedidos que exceden límite de política
  if (policy?.limitPerDay) {
    const exceedPolicy = orders.filter(
      (o) => Number(o.price) > Number(policy.limitPerDay)
    ).length
    if (exceedPolicy > 0) {
      issues.push({
        type: 'EXCEEDS_POLICY_LIMIT',
        severity: 'LOW',
        count: exceedPolicy,
        message: `${exceedPolicy} pedidos exceden límite de política`,
      })
    }
  }

  // 4. Pedidos sin integrityHash
  const withoutHash = orders.filter((o) => !o.integrityHash).length
  if (withoutHash > 0) {
    issues.push({
      type: 'NO_INTEGRITY_HASH',
      severity: 'HIGH',
      count: withoutHash,
      message: `${withoutHash} pedidos sin hash de integridad`,
    })
  }

  return {
    totalOrders: orders.length,
    compliant: issues.length === 0,
    issues,
  }
}

// ============================================================================
// EXPORTAR DOSSIER FISCAL (PDF data)
// ============================================================================

export async function exportFiscalDossier(
  tenantEmpresa: string,
  companyId: string,
  year: number,
  month: number
) {
  const report = await getOrGenerateFiscalReport(tenantEmpresa, year, month)
  const compliance = await checkFiscalCompliance(tenantEmpresa, companyId, year, month)

  // Obtener datos de la empresa
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      legalName: true,
      cif: true,
      billingAddress: true,
    },
  })

  // Obtener política
  const policy = await prisma.companyPolicy.findUnique({
    where: { companyId },
  })

  return {
    company,
    policy,
    report,
    compliance,
    generatedAt: new Date(),
  }
}

