/**
 * Queries para el Dashboard del Súper Admin
 * Métricas agregadas de múltiples tablas con relaciones complejas
 */

import { prisma } from '@/lib/db/prisma'
import { addDays, startOfDay, endOfDay, subDays, startOfMonth } from 'date-fns'

/**
 * KPIs principales del dashboard
 * Agrega datos de Tenants, Orders, Incidents, Invoices
 */
export async function getDashboardKPIs() {
  const today = new Date()
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)
  const startOfThisMonth = startOfMonth(today)
  const last7Days = subDays(today, 7)

  // Ejecutar todas las queries en paralelo para mejor performance
  const [
    // Tenants
    totalTenants,
    activeTenants,
    companiesCount,
    cateringsCount,
    
    // Pedidos de hoy
    todayOrders,
    todayDelivered,
    todayPending,
    todayCancelled,
    
    // Incidencias
    openIncidents,
    criticalIncidents,
    avgResolutionTime,
    
    // Facturación del mes
    monthRevenue,
    monthCommissions,
    
    // Puntualidad (últimos 7 días)
    deliveryEvents,
    
    // Adopción
    activeEmployees,
    totalEmployees,
  ] = await Promise.all([
    // Total de tenants
    prisma.tenant.count({
      where: {
        deletedAt: null,
        id: { not: 'ROOT' }, // Excluir tenant ROOT
      },
    }),
    
    // Tenants activos
    prisma.tenant.count({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        id: { not: 'ROOT' },
      },
    }),
    
    // Empresas
    prisma.tenant.count({
      where: {
        deletedAt: null,
        type: 'EMPRESA',
      },
    }),
    
    // Caterings
    prisma.tenant.count({
      where: {
        deletedAt: null,
        type: 'CATERING',
      },
    }),
    
    // Pedidos de hoy
    prisma.order.count({
      where: {
        serviceDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),
    
    // Pedidos entregados hoy
    prisma.order.count({
      where: {
        serviceDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
        status: 'DELIVERED',
      },
    }),
    
    // Pedidos pendientes hoy
    prisma.order.count({
      where: {
        serviceDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
        status: {
          in: ['CONFIRMED', 'LOCKED_AFTER_CUTOFF'],
        },
      },
    }),
    
    // Pedidos cancelados hoy
    prisma.order.count({
      where: {
        serviceDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
        status: {
          in: ['CANCELLED_BEFORE_CUTOFF', 'NO_SHOW'],
        },
      },
    }),
    
    // Incidencias abiertas
    prisma.incident.count({
      where: {
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
      },
    }),
    
    // Incidencias críticas (severidad alta)
    prisma.incident.count({
      where: {
        severity: 'HIGH',
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
      },
    }),
    
    // Tiempo medio de resolución (últimas 30 incidencias resueltas)
    prisma.incident.findMany({
      where: {
        status: 'RESOLVED',
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
      orderBy: {
        resolvedAt: 'desc',
      },
      take: 30,
    }),
    
    // Facturación del mes actual
    prisma.invoice.aggregate({
      where: {
        issueDate: {
          gte: startOfThisMonth,
        },
        status: {
          in: ['PAID', 'ISSUED', 'SENT'],
        },
      },
      _sum: {
        total: true,
      },
    }),
    
    // Comisiones del mes
    prisma.order.aggregate({
      where: {
        serviceDate: {
          gte: startOfThisMonth,
        },
        status: 'DELIVERED',
      },
      _sum: {
        price: true,
      },
    }),
    
    // Eventos de entrega (últimos 7 días para calcular puntualidad)
    prisma.deliveryEvent.findMany({
      where: {
        timestamp: {
          gte: last7Days,
        },
        event: 'DELIVERED',
      },
      select: {
        timestamp: true,
        order: {
          select: {
            serviceDate: true,
          },
        },
      },
    }),
    
    // Empleados activos (que han pedido al menos 2 días en las últimas 2 semanas)
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT employee_id) as count
      FROM orders
      WHERE service_date >= ${subDays(today, 14)}
        AND status IN ('delivered', 'confirmed', 'locked_after_cutoff')
      GROUP BY employee_id
      HAVING COUNT(*) >= 2
    `,
    
    // Total de empleados
    prisma.employee.count({
      where: {
        deletedAt: null,
      },
    }),
  ])

  // Calcular tiempo medio de resolución
  const resolutionTimes = avgResolutionTime
    .filter((inc) => inc.resolvedAt)
    .map((inc) => {
      const diff = inc.resolvedAt!.getTime() - inc.createdAt.getTime()
      return diff / (1000 * 60 * 60) // Convertir a horas
    })
  
  const avgResolutionHours = resolutionTimes.length > 0
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : 0

  // Calcular % de puntualidad (entregas dentro de ventana 12:00-13:30)
  const onTimeDeliveries = deliveryEvents.filter((event) => {
    const deliveryTime = event.timestamp
    const hour = deliveryTime.getHours()
    const minute = deliveryTime.getMinutes()
    
    // Ventana: 12:00 - 13:30
    const isOnTime = 
      (hour === 12) || 
      (hour === 13 && minute <= 30)
    
    return isOnTime
  }).length

  const punctualityPercentage = deliveryEvents.length > 0
    ? (onTimeDeliveries / deliveryEvents.length) * 100
    : 0

  // Calcular % de adopción
  const activeEmployeesCount = Number(activeEmployees[0]?.count || 0)
  const adoptionPercentage = totalEmployees > 0
    ? (activeEmployeesCount / totalEmployees) * 100
    : 0

  // Calcular comisión estimada (10% del volumen)
  const commissionRate = 0.10
  const estimatedCommission = (Number(monthCommissions._sum.price || 0)) * commissionRate

  return {
    tenants: {
      total: totalTenants,
      active: activeTenants,
      companies: companiesCount,
      caterings: cateringsCount,
      inactivePercentage: totalTenants > 0 
        ? ((totalTenants - activeTenants) / totalTenants) * 100 
        : 0,
    },
    orders: {
      today: todayOrders,
      delivered: todayDelivered,
      pending: todayPending,
      cancelled: todayCancelled,
      deliveredPercentage: todayOrders > 0 ? (todayDelivered / todayOrders) * 100 : 0,
      cancelledPercentage: todayOrders > 0 ? (todayCancelled / todayOrders) * 100 : 0,
    },
    incidents: {
      open: openIncidents,
      critical: criticalIncidents,
      avgResolutionTimeHours: Math.round(avgResolutionHours * 10) / 10,
    },
    revenue: {
      monthTotal: Number(monthRevenue._sum.total || 0),
      monthCommissions: estimatedCommission,
    },
    quality: {
      punctualityPercentage: Math.round(punctualityPercentage * 10) / 10,
    },
    adoption: {
      activeEmployees: activeEmployeesCount,
      totalEmployees,
      percentage: Math.round(adoptionPercentage * 10) / 10,
    },
  }
}

/**
 * Obtener datos para las gráficas
 */
export async function getDashboardCharts() {
  const today = new Date()
  const last30Days = subDays(today, 30)

  // Pedidos por día (últimos 30 días)
  const ordersPerDay = await prisma.$queryRaw<
    { date: Date; count: bigint }[]
  >`
    SELECT 
      DATE(service_date) as date,
      COUNT(*) as count
    FROM orders
    WHERE service_date >= ${last30Days}
      AND service_date <= ${today}
    GROUP BY DATE(service_date)
    ORDER BY date ASC
  `

  // Nuevas empresas vs churn (últimos 6 meses)
  const last6Months = subDays(today, 180)
  
  const newCompanies = await prisma.$queryRaw<
    { month: string; count: bigint }[]
  >`
    SELECT 
      TO_CHAR(created_at, 'YYYY-MM') as month,
      COUNT(*) as count
    FROM tenants
    WHERE type = 'empresa'
      AND created_at >= ${last6Months}
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY month ASC
  `

  const churnedCompanies = await prisma.$queryRaw<
    { month: string; count: bigint }[]
  >`
    SELECT 
      TO_CHAR(deleted_at, 'YYYY-MM') as month,
      COUNT(*) as count
    FROM tenants
    WHERE type = 'empresa'
      AND deleted_at IS NOT NULL
      AND deleted_at >= ${last6Months}
    GROUP BY TO_CHAR(deleted_at, 'YYYY-MM')
    ORDER BY month ASC
  `

  // Ingresos por mes (últimos 12 meses)
  const last12Months = subDays(today, 365)
  
  const revenuePerMonth = await prisma.$queryRaw<
    { month: string; total: number }[]
  >`
    SELECT 
      period as month,
      SUM(total) as total
    FROM invoices
    WHERE issue_date >= ${last12Months}
      AND status IN ('paid', 'issued', 'sent')
    GROUP BY period
    ORDER BY period ASC
  `

  return {
    ordersPerDay: ordersPerDay.map((row) => ({
      date: row.date,
      count: Number(row.count),
    })),
    companiesGrowth: {
      new: newCompanies.map((row) => ({
        month: row.month,
        count: Number(row.count),
      })),
      churned: churnedCompanies.map((row) => ({
        month: row.month,
        count: Number(row.count),
      })),
    },
    revenuePerMonth: revenuePerMonth.map((row) => ({
      month: row.month,
      total: Number(row.total),
    })),
  }
}

/**
 * Obtener alertas críticas del sistema
 */
export async function getDashboardAlerts() {
  const today = new Date()
  const next30Days = addDays(today, 30)

  // Documentos a punto de vencer (próximos 30 días)
  const expiringDocuments = await prisma.restaurantDocument.findMany({
    where: {
      expiresAt: {
        lte: next30Days,
        gte: today,
      },
    },
    include: {
      restaurant: {
        include: {
          tenant: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      expiresAt: 'asc',
    },
    take: 10,
  })

  // Caterings inactivos (sin pedidos en los últimos 7 días)
  const last7Days = subDays(today, 7)
  
  // Obtener IDs de caterings con pedidos recientes
  const activeCateringIds = await prisma.order.findMany({
    where: {
      serviceDate: {
        gte: last7Days,
      },
    },
    select: {
      tenantCatering: true,
    },
    distinct: ['tenantCatering'],
  })

  const activeCateringIdSet = new Set(activeCateringIds.map(o => o.tenantCatering))

  const inactiveCaterings = await prisma.tenant.findMany({
    where: {
      type: 'CATERING',
      status: 'ACTIVE',
      deletedAt: null,
      id: {
        notIn: Array.from(activeCateringIdSet),
      },
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
    take: 10,
  })

  // Empresas sin pedidos (últimos 7 días)
  const activeCompanyIds = await prisma.order.findMany({
    where: {
      serviceDate: {
        gte: last7Days,
      },
    },
    select: {
      tenantEmpresa: true,
    },
    distinct: ['tenantEmpresa'],
  })

  const activeCompanyIdSet = new Set(activeCompanyIds.map(o => o.tenantEmpresa))

  const inactiveCompanies = await prisma.tenant.findMany({
    where: {
      type: 'EMPRESA',
      status: 'ACTIVE',
      deletedAt: null,
      id: {
        notIn: Array.from(activeCompanyIdSet),
      },
    },
    select: {
      id: true,
      name: true,
    },
    take: 10,
  })

  // Picos de cancelaciones (si >20% de pedidos cancelados hoy)
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)
  
  const cancellationSpikes = await prisma.$queryRaw<
    { tenant_id: string; tenant_name: string; total: bigint; cancelled: bigint }[]
  >`
    SELECT 
      t.id as tenant_id,
      t.name as tenant_name,
      COUNT(*) as total,
      SUM(CASE WHEN o.status IN ('cancelled_before_cutoff', 'no_show') THEN 1 ELSE 0 END) as cancelled
    FROM orders o
    JOIN tenants t ON o.tenant_empresa = t.id
    WHERE o.service_date >= ${startOfToday}
      AND o.service_date <= ${endOfToday}
    GROUP BY t.id, t.name
    HAVING (SUM(CASE WHEN o.status IN ('cancelled_before_cutoff', 'no_show') THEN 1 ELSE 0 END)::float / COUNT(*)) > 0.2
    ORDER BY cancelled DESC
    LIMIT 5
  `

  // Errores de facturación (facturas anuladas)
  const failedInvoices = await prisma.invoice.count({
    where: {
      status: 'VOID',
    },
  })

  return {
    expiringDocuments: expiringDocuments.map((doc) => ({
      id: doc.id,
      documentType: doc.type,
      expiryDate: doc.expiresAt,
      restaurantName: doc.restaurant.tenant.name,
      restaurantId: doc.restaurant.tenantId,
      daysUntilExpiry: Math.ceil(
        (doc.expiresAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      ),
    })),
    inactiveCaterings: inactiveCaterings.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      daysSinceLastOrder: Math.ceil(
        (today.getTime() - tenant.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
    })),
    inactiveCompanies: inactiveCompanies.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
    })),
    cancellationSpikes: cancellationSpikes.map((spike) => ({
      tenantId: spike.tenant_id,
      tenantName: spike.tenant_name,
      total: Number(spike.total),
      cancelled: Number(spike.cancelled),
      percentage: Math.round((Number(spike.cancelled) / Number(spike.total)) * 100),
    })),
    failedInvoicesCount: failedInvoices,
  }
}

/**
 * Obtener actividad reciente del sistema
 */
export async function getRecentActivity() {
  // Últimos 10 registros de tenants
  const recentTenants = await prisma.tenant.findMany({
    where: {
      deletedAt: null,
      id: { not: 'ROOT' },
    },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  })

  // Últimas 10 incidencias
  const recentIncidents = await prisma.incident.findMany({
    select: {
      id: true,
      type: true,
      severity: true,
      status: true,
      createdAt: true,
      tenantEmpresa: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  })

  // Últimos 10 usuarios creados
  const recentUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      nameEnc: true,
      email: true,
      role: true,
      createdAt: true,
      tenant: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  })

  return {
    tenants: recentTenants,
    incidents: recentIncidents,
    users: recentUsers,
  }
}

