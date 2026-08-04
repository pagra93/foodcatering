/**
 * Queries para el Dashboard del Portal de Empresa
 * KPIs, alertas, gráficas y actividad reciente
 */

import { prisma } from '@/lib/db/prisma'
import { subDays, startOfMonth, startOfWeek, startOfDay, endOfDay, format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function getCompanyDashboardData(tenantId: string) {
  const today = new Date()
  const thirtyDaysAgo = subDays(today, 30)
  const startOfCurrentMonth = startOfMonth(today)
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }) // Lunes

  // ============================================================================
  // KPIS
  // ============================================================================

  const [
    // Empleados
    totalEmployees,
    activeEmployees,
    employeesWithOrdersThisWeek,
    
    // Pedidos
    ordersToday,
    ordersThisWeek,
    ordersThisMonth,
    ordersLast30Days,
    
    // Financiero
    totalSpendThisMonth,
    totalSpendLast30Days,
    
    // Cancelaciones
    cancelledOrdersThisWeek,
    
    // Incidencias
    openIncidents,
    
    // Catering
    cateringAssignment,
  ] = await Promise.all([
    // Empleados totales
    prisma.employee.count({
      where: { tenantId, status: 'ACTIVE', deletedAt: null },
    }),
    
    // Empleados con al menos 1 pedido este mes. groupBy agrega en SQL;
    // `findMany({ distinct })` traería todos los pedidos del mes a Node.
    prisma.order.groupBy({
      by: ['employeeId'],
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: startOfCurrentMonth },
        deletedAt: null,
      },
    }).then((rows) => rows.length),

    // Empleados con pedidos esta semana
    prisma.order.groupBy({
      by: ['employeeId'],
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: startOfCurrentWeek },
        deletedAt: null,
      },
    }).then((rows) => rows.length),
    
    // Pedidos hoy (rango del día completo, no timestamp exacto)
    prisma.order.count({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
        deletedAt: null,
      },
    }),
    
    // Pedidos esta semana
    prisma.order.count({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: startOfCurrentWeek },
        deletedAt: null,
      },
    }),
    
    // Pedidos este mes
    prisma.order.count({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: startOfCurrentMonth },
        deletedAt: null,
      },
    }),
    
    // Pedidos últimos 30 días
    prisma.order.count({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
    }),
    
    // Gasto total este mes
    prisma.order.aggregate({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: startOfCurrentMonth },
        deletedAt: null,
      },
      _sum: { price: true },
    }).then((result) => result._sum.price || 0),
    
    // Gasto total últimos 30 días
    prisma.order.aggregate({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
      _sum: { price: true },
    }).then((result) => result._sum.price || 0),
    
    // Cancelaciones esta semana
    prisma.order.count({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: startOfCurrentWeek },
        status: 'CANCELLED_BEFORE_CUTOFF',
        deletedAt: null,
      },
    }),
    
    // Incidencias abiertas
    prisma.incident.count({
      where: {
        tenantEmpresa: tenantId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    }),
    
    // Catering asignado (obtener solo el assignment)
    prisma.companyCateringAssignment.findFirst({
      where: {
        tenantEmpresa: tenantId,
        type: 'PRIMARY',
        active: true,
      },
          select: {
        tenantCatering: true,
      },
    }),
  ])

  // Cálculos derivados
  const adoptionRate = totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 0
  const avgTicket = ordersThisMonth > 0 ? Number(totalSpendThisMonth) / ordersThisMonth : 0
  const cancellationRate = ordersThisWeek > 0 ? (cancelledOrdersThisWeek / ordersThisWeek) * 100 : 0

  // ============================================================================
  // ALERTAS
  // ============================================================================

  const alerts = []

  // Alerta: Adopción baja
  if (adoptionRate < 50) {
    alerts.push({
      type: 'warning' as const,
      title: 'Adopción baja',
      message: `Solo el ${adoptionRate}% de empleados está usando el beneficio`,
      actionUrl: '/empresa/empleados',
      actionLabel: 'Ver empleados',
    })
  }

  // Alerta: Cancelaciones altas
  if (cancellationRate > 20) {
    alerts.push({
      type: 'warning' as const,
      title: 'Cancelaciones elevadas',
      message: `${cancellationRate.toFixed(1)}% de pedidos cancelados esta semana`,
      actionUrl: '/empresa/pedidos',
      actionLabel: 'Ver pedidos',
    })
  }

  // Alerta: Incidencias abiertas
  if (openIncidents > 5) {
    alerts.push({
      type: 'error' as const,
      title: 'Múltiples incidencias',
      message: `${openIncidents} incidencias pendientes de resolución`,
      actionUrl: '/empresa/incidencias',
      actionLabel: 'Ver incidencias',
    })
  }

  // Alerta: Sin catering asignado
  if (!cateringAssignment) {
    alerts.push({
      type: 'error' as const,
      title: 'Sin catering asignado',
      message: 'Contacta con Comida.com para asignar un catering',
      actionUrl: '/empresa/configuracion/catering',
      actionLabel: 'Configurar',
    })
  }

  // ============================================================================
  // GRÁFICAS - Evolución de pedidos últimos 30 días
  // ============================================================================

  const ordersByDay = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
    SELECT 
      DATE(service_date) as date,
      COUNT(*)::bigint as count
    FROM orders
    WHERE tenant_empresa = ${tenantId}
      AND service_date >= ${thirtyDaysAgo}
      AND deleted_at IS NULL
    GROUP BY DATE(service_date)
    ORDER BY DATE(service_date) ASC
  `

  const chartData = ordersByDay.map((row) => ({
    date: format(new Date(row.date), 'd MMM', { locale: es }),
    pedidos: Number(row.count),
  }))

  // ============================================================================
  // ACTIVIDAD RECIENTE
  // ============================================================================

  const recentOrders = await prisma.order.findMany({
    where: {
      tenantEmpresa: tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      employeeId: true,
      serviceDate: true,
      status: true,
      price: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const recentActivity = recentOrders.map((order) => ({
    id: order.id,
    type: 'order' as const,
    employeeId: order.employeeId,
    description: `Pedido para ${format(new Date(order.serviceDate), "d 'de' MMMM", { locale: es })}`,
    status: order.status,
    amount: Number(order.price),
    timestamp: order.createdAt,
  }))

  // ============================================================================
  // RETORNO
  // ============================================================================

  return {
    kpis: {
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        activeThisWeek: employeesWithOrdersThisWeek,
        adoptionRate,
      },
      orders: {
        today: ordersToday,
        thisWeek: ordersThisWeek,
        thisMonth: ordersThisMonth,
        last30Days: ordersLast30Days,
        avgPerDay: ordersLast30Days > 0 ? Math.round(ordersLast30Days / 30) : 0,
      },
      financial: {
        totalSpendThisMonth: Number(totalSpendThisMonth),
        totalSpendLast30Days: Number(totalSpendLast30Days),
        avgTicket,
      },
      cancellations: {
        thisWeek: cancelledOrdersThisWeek,
        rate: cancellationRate,
      },
      incidents: {
        open: openIncidents,
      },
    },
    alerts,
    charts: {
      ordersByDay: chartData,
    },
    recentActivity,
    catering: cateringAssignment ? {
      tenantId: cateringAssignment.tenantCatering,
    } : null,
  }
}

