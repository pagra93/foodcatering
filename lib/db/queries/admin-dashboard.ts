/**
 * Queries para el Dashboard del Súper Admin
 * Métricas agregadas de múltiples tablas con relaciones complejas
 */

// F5: panel admin = lecturas cross-tenant a propósito → cliente sin guard.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
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
  // Periodo "YYYY-MM" para cruzar con Settlement.period
  const currentPeriod = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, '0')}`

  // Ejecutar todas las queries en paralelo para mejor performance
  const [
    // Tenants
    totalTenants,
    activeTenants,
    totalCompanies,
    activeCompanies,
    totalCaterings,
    activeCaterings,

    // Pedidos de hoy
    todayOrders,
    todayDelivered,
    todayPending,
    todayCancelled,
    
    // Incidencias
    openIncidents,
    criticalIncidents,

    // Facturación del mes
    monthRevenue,
    monthCommissions,

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
    
    // Empresas (total, todas las no borradas)
    prisma.tenant.count({
      where: {
        deletedAt: null,
        type: 'EMPRESA',
      },
    }),

    // Empresas activas
    prisma.tenant.count({
      where: {
        deletedAt: null,
        type: 'EMPRESA',
        status: 'ACTIVE',
      },
    }),

    // Caterings (total, todos los no borrados)
    prisma.tenant.count({
      where: {
        deletedAt: null,
        type: 'CATERING',
      },
    }),

    // Caterings activos
    prisma.tenant.count({
      where: {
        deletedAt: null,
        type: 'CATERING',
        status: 'ACTIVE',
      },
    }),
    
    // Pedidos de hoy (sin borrados, para cuadrar con el portal empresa)
    prisma.order.count({
      where: {
        serviceDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
        deletedAt: null,
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
        deletedAt: null,
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
        deletedAt: null,
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
        deletedAt: null,
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
    
    // Incidencias críticas (severidad alta = máximo del enum LOW/MEDIUM/HIGH)
    prisma.incident.count({
      where: {
        severity: 'HIGH',
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
      },
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

    // Comisiones del mes — fuente real: liquidaciones (Settlement) del periodo.
    // commissionAmount ya aplica la commissionRate por catering (no estimación fija).
    prisma.settlement.aggregate({
      where: {
        period: currentPeriod,
      },
      _sum: {
        commissionAmount: true,
      },
    }),

    // Empleados activos (que han pedido al menos 2 días en las últimas 2
    // semanas). El GROUP BY va en subconsulta: la versión anterior devolvía
    // una fila POR empleado y el KPI leía solo la primera (siempre 0 o 1).
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM (
        SELECT employee_id
        FROM orders
        WHERE service_date >= ${subDays(today, 14)}
          AND status IN ('delivered', 'confirmed', 'locked_after_cutoff')
          AND deleted_at IS NULL
        GROUP BY employee_id
        HAVING COUNT(*) >= 2
      ) actives
    `,
    
    // Total de empleados
    prisma.employee.count({
      where: {
        deletedAt: null,
      },
    }),
  ])

  // Calcular % de adopción
  const activeEmployeesCount = Number(activeEmployees[0]?.count || 0)
  const adoptionPercentage = totalEmployees > 0
    ? (activeEmployeesCount / totalEmployees) * 100
    : 0

  return {
    tenants: {
      total: totalTenants,
      active: activeTenants,
      companies: totalCompanies,
      activeCompanies,
      caterings: totalCaterings,
      activeCaterings,
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
    },
    revenue: {
      monthTotal: Number(monthRevenue._sum.total || 0),
      monthCommissions: Number(monthCommissions._sum.commissionAmount || 0),
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
  // Nuevas empresas vs churn (últimos 6 meses)
  const last6Months = subDays(today, 180)
  // Ingresos por mes (últimos 12 meses)
  const last12Months = subDays(today, 365)

  // Las 4 agregaciones son independientes → en paralelo.
  const [ordersPerDay, newCompanies, churnedCompanies, revenuePerMonth] =
    await Promise.all([
      // Pedidos por día (últimos 30 días)
      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT
          DATE(service_date) as date,
          COUNT(*) as count
        FROM orders
        WHERE service_date >= ${last30Days}
          AND service_date <= ${today}
        GROUP BY DATE(service_date)
        ORDER BY date ASC
      `,
      prisma.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*) as count
        FROM tenants
        WHERE type = 'empresa'
          AND created_at >= ${last6Months}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month ASC
      `,
      prisma.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT
          TO_CHAR(deleted_at, 'YYYY-MM') as month,
          COUNT(*) as count
        FROM tenants
        WHERE type = 'empresa'
          AND deleted_at IS NOT NULL
          AND deleted_at >= ${last6Months}
        GROUP BY TO_CHAR(deleted_at, 'YYYY-MM')
        ORDER BY month ASC
      `,
      prisma.$queryRaw<{ month: string; total: number }[]>`
        SELECT
          period as month,
          SUM(total) as total
        FROM invoices
        WHERE issue_date >= ${last12Months}
          AND status IN ('paid', 'issued', 'sent')
        GROUP BY period
        ORDER BY period ASC
      `,
    ])

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
  // Caterings/empresas inactivos = sin pedidos en los últimos 7 días
  const last7Days = subDays(today, 7)
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)

  // Primera ola: todo lo independiente en paralelo. Los sets de tenants con
  // pedidos recientes se agregan en SQL (groupBy) — `findMany({ distinct })`
  // sin el preview nativeDistinct traería TODOS los pedidos de la semana a
  // Node para deduplicar en JS.
  const [
    expiringDocuments,
    activeCateringTenants,
    activeCompanyTenants,
    cancellationSpikes,
    failedInvoices,
  ] = await Promise.all([
    // Documentos a punto de vencer (próximos 30 días)
    prisma.restaurantDocument.findMany({
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
    }),

    // Caterings con pedidos recientes
    prisma.order.groupBy({
      by: ['tenantCatering'],
      where: {
        serviceDate: {
          gte: last7Days,
        },
      },
    }),

    // Empresas con pedidos recientes
    prisma.order.groupBy({
      by: ['tenantEmpresa'],
      where: {
        serviceDate: {
          gte: last7Days,
        },
      },
    }),

    // Picos de cancelaciones (si >20% de pedidos cancelados hoy)
    prisma.$queryRaw<
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
    `,

    // Errores de facturación (facturas anuladas)
    prisma.invoice.count({
      where: {
        status: 'VOID',
      },
    }),
  ])

  const activeCateringIdSet = new Set(
    activeCateringTenants.map((o) => o.tenantCatering)
  )
  const activeCompanyIdSet = new Set(
    activeCompanyTenants.map((o) => o.tenantEmpresa)
  )

  // Segunda ola: depende de los sets anteriores.
  const [inactiveCaterings, inactiveCompanies] = await Promise.all([
    // Caterings inactivos (sin pedidos en los últimos 7 días)
    prisma.tenant.findMany({
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
    }),

    // Empresas sin pedidos (últimos 7 días)
    prisma.tenant.findMany({
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
    }),
  ])

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
  // Las 3 lecturas son independientes → en paralelo.
  const [recentTenants, recentIncidents, recentUsers] = await Promise.all([
    // Últimos registros de tenants
    prisma.tenant.findMany({
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
    }),

    // Últimas incidencias
    prisma.incident.findMany({
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
    }),

    // Últimos usuarios creados
    prisma.user.findMany({
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
    }),
  ])

  return {
    tenants: recentTenants,
    incidents: recentIncidents,
    users: recentUsers,
  }
}

