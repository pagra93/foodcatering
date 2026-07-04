/**
 * Queries para gestión de Facturación en Portal Empresa
 * ♻️ REUTILIZA estructura del portal de Admin adaptada para empresa
 */

import { prisma } from '@/lib/db/prisma'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

// ♻️ REUTILIZAR mapeo de estados (mismo que en admin)
export const INVOICE_STATUS_MAP = {
  DRAFT: { label: 'Borrador', variant: 'outline' as const, color: 'bg-gray-100' },
  PENDING: { label: 'Pendiente', variant: 'warning' as const, color: 'bg-yellow-100' },
  SENT: { label: 'Enviada', variant: 'default' as const, color: 'bg-blue-100' },
  PAID: { label: 'Pagada', variant: 'success' as const, color: 'bg-green-100' },
  OVERDUE: { label: 'Vencida', variant: 'destructive' as const, color: 'bg-red-100' },
  CANCELLED: { label: 'Anulada', variant: 'outline' as const, color: 'bg-gray-100' },
}

// ============================================================================
// OBTENER RESUMEN DE FACTURACIÓN
// ============================================================================

export async function getBillingSum(tenantId: string) {
  const thisMonth = startOfMonth(new Date())
  const lastMonth = startOfMonth(subMonths(new Date(), 1))

  const [thisMonthOrders, lastMonthOrders, unpaidInvoices, policy] = await Promise.all([
    // Pedidos de este mes
    prisma.order.aggregate({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: thisMonth },
        status: 'DELIVERED',
      },
      _sum: { price: true },
      _count: true,
    }),

    // Pedidos del mes pasado
    prisma.order.aggregate({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: {
          gte: lastMonth,
          lt: thisMonth,
        },
        status: 'DELIVERED',
      },
      _sum: { price: true },
      _count: true,
    }),

    // Facturas pendientes de pago (sin modelo Invoice aún, placeholder)
    Promise.resolve(0),

    // Política de empresa para calcular split
    prisma.companyPolicy.findUnique({
      where: { companyId: tenantId },
      select: { copayCompany: true, copayEmployee: true },
    }),
  ])

  // Calcular porcentaje de subsidio basado en copayCompany y copayEmployee
  const totalCopay = Number(policy?.copayCompany || 0) + Number(policy?.copayEmployee || 0)
  const subsidyPercentage = totalCopay > 0 ? (Number(policy?.copayCompany || 0) / totalCopay) * 100 : 100

  return {
    thisMonth: {
      totalOrders: thisMonthOrders._count,
      totalAmount: Number(thisMonthOrders._sum.price || 0),
      companyPart: Number(thisMonthOrders._sum.price || 0) * (subsidyPercentage / 100),
      employeePart: Number(thisMonthOrders._sum.price || 0) * ((100 - subsidyPercentage) / 100),
    },
    lastMonth: {
      totalOrders: lastMonthOrders._count,
      totalAmount: Number(lastMonthOrders._sum.price || 0),
      companyPart: Number(lastMonthOrders._sum.price || 0) * (subsidyPercentage / 100),
      employeePart: Number(lastMonthOrders._sum.price || 0) * ((100 - subsidyPercentage) / 100),
    },
    unpaidInvoices,
    subsidyPercentage,
  }
}

// ============================================================================
// OBTENER HISTÓRICO DE FACTURACIÓN POR MES
// ============================================================================

export async function getMonthlyBilling(tenantId: string, months: number = 12) {
  const startDate = startOfMonth(subMonths(new Date(), months))

  const monthlyData = await prisma.$queryRaw<
    Array<{ month: string; orders: bigint; total: number }>
  >`
    SELECT 
      TO_CHAR(service_date, 'YYYY-MM') as month,
      COUNT(*)::bigint as orders,
      SUM(price)::numeric as total
    FROM orders
    WHERE tenant_empresa = ${tenantId}
      AND service_date >= ${startDate}
      AND status = 'DELIVERED'
    GROUP BY TO_CHAR(service_date, 'YYYY-MM')
    ORDER BY month ASC
  `

  return monthlyData.map((item) => ({
    month: item.month,
    orders: Number(item.orders),
    total: Number(item.total),
  }))
}

// ============================================================================
// OBTENER DESGLOSE MENSUAL DETALLADO
// ============================================================================

export async function getMonthlyBreakdown(
  tenantId: string,
  year: number,
  month: number
) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)

  const [orders, policy, cateringAssignment] = await Promise.all([
    // Todos los pedidos del mes
    prisma.order.findMany({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: startDate, lte: endDate },
        status: 'DELIVERED',
      },
      select: {
        id: true,
        serviceDate: true,
        price: true,
        employeeId: true,
      },
    }),

    // Política de empresa
    prisma.companyPolicy.findUnique({
      where: { companyId: tenantId },
      select: { copayCompany: true, copayEmployee: true },
    }),

    // Catering asignado
    prisma.companyCateringAssignment.findFirst({
      where: {
        companyId: tenantId,
        active: true,
        type: 'PRIMARY',
      },
          select: {
        tenantCatering: true,
      },
    }),
  ])

  // Obtener restaurant info si hay assignment
  let restaurant = null
  if (cateringAssignment) {
    restaurant = await prisma.restaurant.findUnique({
      where: { tenantId: cateringAssignment.tenantCatering },
      select: {
        legalName: true,
        saasPlan: {
          select: { pricingModel: true, commissionPct: true },
        },
      },
    })
  }

  // Comisión efectiva desde el plan del catering: COMMISSION → commissionPct;
  // FIXED → 0 (cuota fija, no por factura); sin plan → 0.
  const plan = restaurant?.saasPlan
  const effectiveCommission =
    plan?.pricingModel === 'COMMISSION' ? Number(plan.commissionPct ?? 0) : 0

  // Calcular porcentaje de subsidio basado en copayCompany y copayEmployee
  const totalCopay = Number(policy?.copayCompany || 0) + Number(policy?.copayEmployee || 0)
  const subsidyPercentage = totalCopay > 0 ? (Number(policy?.copayCompany || 0) / totalCopay) * 100 : 100
  const commissionRate = effectiveCommission * 100 // Convertir decimal a porcentaje

  // Calcular totales
  const subtotal = orders.reduce((sum, o) => sum + Number(o.price), 0)
  const companyPart = subtotal * (subsidyPercentage / 100)
  const employeePart = subtotal * ((100 - subsidyPercentage) / 100)
  const commission = subtotal * effectiveCommission

  // Agrupar por empleado
  const byEmployee = orders.reduce((acc, order) => {
    if (!acc[order.employeeId]) {
      acc[order.employeeId] = {
        employeeId: order.employeeId,
        orders: 0,
        total: 0,
      }
    }
    const bucket = acc[order.employeeId]!
    bucket.orders++
    bucket.total += Number(order.price)
    return acc
  }, {} as Record<string, { employeeId: string; orders: number; total: number }>)

  return {
    period: { year, month, startDate, endDate },
    summary: {
      totalOrders: orders.length,
      subtotal,
      companyPart,
      employeePart,
      commission,
      subsidyPercentage,
      commissionRate: Number(commissionRate),
    },
    catering: {
      name: restaurant?.legalName || 'No asignado',
    },
    byEmployee: Object.values(byEmployee),
  }
}

// ============================================================================
// EXPORT PARA ERP (CSV)
// ============================================================================

export type ERPFormat = 'A3' | 'SAGE' | 'SAP' | 'GENERIC'

export async function exportToERP(
  tenantId: string,
  year: number,
  month: number,
  format: ERPFormat = 'GENERIC'
) {
  const breakdown = await getMonthlyBreakdown(tenantId, year, month)

  // Obtener nombres de empleados
  const employeeIds = breakdown.byEmployee.map((e) => e.employeeId)
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: {
      id: true,
      employeeNumber: true,
      user: {
        select: {
          nameEnc: true,
          email: true,
        },
      },
    },
  })

  const employeeMap = new Map(employees.map((e) => [e.id, e]))

  // Generar CSV según formato
  let headers: string[]
  let rows: string[][]

  switch (format) {
    case 'A3':
      headers = [
        'Código Empleado',
        'Nombre',
        'Concepto',
        'Importe',
        'Fecha',
        'Cuenta Contable',
      ]
      rows = breakdown.byEmployee.map((emp) => {
        const employee = employeeMap.get(emp.employeeId)
        return [
          employee?.employeeNumber || emp.employeeId.slice(-8),
          employee?.user.nameEnc || 'N/A',
          'TICKET RESTAURANT',
          emp.total.toFixed(2),
          `${year}-${month.toString().padStart(2, '0')}`,
          '629', // Cuenta contable típica para ticket restaurant
        ]
      })
      break

    case 'SAGE':
      headers = ['NIF', 'Nombre', 'Importe', 'Descripción', 'Fecha']
      rows = breakdown.byEmployee.map((emp) => {
        const employee = employeeMap.get(emp.employeeId)
        return [
          '', // NIF no disponible
          employee?.user.nameEnc || 'N/A',
          emp.total.toFixed(2),
          `Comida ${year}/${month}`,
          `${year}${month.toString().padStart(2, '0')}`,
        ]
      })
      break

    case 'SAP':
      headers = [
        'PERNR',
        'LGART',
        'BETRAG',
        'WAERS',
        'BEGDA',
        'ENDDA',
        'STEXT',
      ]
      rows = breakdown.byEmployee.map((emp) => {
        const employee = employeeMap.get(emp.employeeId)
        return [
          employee?.employeeNumber || '',
          '9999', // Concepto genérico
          emp.total.toFixed(2),
          'EUR',
          `${year}${month.toString().padStart(2, '0')}01`,
          `${year}${month.toString().padStart(2, '0')}${new Date(year, month, 0).getDate()}`,
          'Ticket Restaurant',
        ]
      })
      break

    default: // GENERIC
      headers = [
        'Empleado ID',
        'Número Empleado',
        'Nombre',
        'Email',
        'Pedidos',
        'Total (€)',
        'Período',
      ]
      rows = breakdown.byEmployee.map((emp) => {
        const employee = employeeMap.get(emp.employeeId)
        return [
          emp.employeeId,
          employee?.employeeNumber || '',
          employee?.user.nameEnc || 'N/A',
          employee?.user.email || '',
          emp.orders.toString(),
          emp.total.toFixed(2),
          `${year}-${month.toString().padStart(2, '0')}`,
        ]
      })
  }

  // Generar CSV
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')

  return {
    content: csvContent,
    filename: `facturacion_${format}_${year}_${month.toString().padStart(2, '0')}.csv`,
    summary: breakdown.summary,
  }
}

// ============================================================================
// CONCILIACIÓN (Detectar discrepancias)
// ============================================================================

export async function getConciliationReport(
  tenantId: string,
  year: number,
  month: number
) {
  const breakdown = await getMonthlyBreakdown(tenantId, year, month)

  // Detectar pedidos con incidencias no resueltas
  const ordersWithIncidents = await prisma.order.findMany({
    where: {
      tenantEmpresa: tenantId,
      serviceDate: {
        gte: breakdown.period.startDate,
        lte: breakdown.period.endDate,
      },
      incidents: {
        some: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      },
    },
    select: {
      id: true,
      serviceDate: true,
      price: true,
      incidents: {
        select: {
          id: true,
          type: true,
          severity: true,
        },
      },
    },
  })

  // Detectar pedidos sin delivery proof
  const ordersWithoutProof = await prisma.order.count({
    where: {
      tenantEmpresa: tenantId,
      serviceDate: {
        gte: breakdown.period.startDate,
        lte: breakdown.period.endDate,
      },
      status: 'DELIVERED',
      deliveryProof: null,
    },
  })

  return {
    summary: breakdown.summary,
    issues: {
      ordersWithOpenIncidents: ordersWithIncidents.length,
      ordersWithoutProof,
      affectedAmount: ordersWithIncidents.reduce(
        (sum, o) => sum + Number(o.price),
        0
      ),
    },
    ordersWithIncidents,
  }
}

