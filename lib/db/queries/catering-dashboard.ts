/**
 * Queries para el Dashboard del Portal del Catering
 * KPIs, alertas, actividad reciente y quick actions
 */

import { prisma } from '@/lib/db/prisma'
import { subDays, startOfDay } from 'date-fns'
import { getCateringQualityMetrics } from '@/lib/db/queries/catering-metrics'

export async function getCateringDashboard(tenantId: string) {
  const today = startOfDay(new Date())
  const thirtyDaysAgo = subDays(today, 30)

  // ============================================================================
  // KPIS GENERALES
  // ============================================================================

  const [
    // Pedidos
    ordersToday,
    ordersThisWeek,
    ordersLast30Days,
    ordersDelivered30Days,

    // Producción
    dishesActive,
    menusPublished,

    // Incidencias
    incidentsOpen,
    incidentsLast30Days,

    // Empresas
    companiesAssigned,

    // Restaurant info
    restaurant,
  ] = await Promise.all([
    // Pedidos hoy
    prisma.order.count({
      where: {
        tenantCatering: tenantId,
        serviceDate: today,
        deletedAt: null,
      },
    }),

    // Pedidos esta semana
    prisma.order.count({
      where: {
        tenantCatering: tenantId,
        serviceDate: {
          gte: subDays(today, 7),
          lte: today,
        },
        deletedAt: null,
      },
    }),

    // Pedidos últimos 30 días
    prisma.order.count({
      where: {
        tenantCatering: tenantId,
        serviceDate: {
          gte: thirtyDaysAgo,
        },
        deletedAt: null,
      },
    }),

    // Pedidos entregados últimos 30 días
    prisma.order.count({
      where: {
        tenantCatering: tenantId,
        serviceDate: {
          gte: thirtyDaysAgo,
        },
        status: 'DELIVERED',
        deletedAt: null,
      },
    }),

    // Platos activos
    prisma.dish.count({
      where: {
        tenantId,
        active: true,
        deletedAt: null,
      },
    }),

    // Menús publicados (próximos 7 días)
    prisma.dishSchedule
      .findMany({
        where: {
          tenantId,
          date: {
            gte: today,
            lte: subDays(today, -7),
          },
          status: 'PUBLISHED',
        },
        select: {
          date: true,
        },
        distinct: ['date'],
      })
      .then((schedules) => schedules.length),

    // Incidencias abiertas
    prisma.incident.count({
      where: {
        tenantCatering: tenantId,
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
      },
    }),

    // Incidencias últimos 30 días
    prisma.incident.count({
      where: {
        tenantCatering: tenantId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),

    // Empresas asignadas activas
    prisma.companyCateringAssignment.count({
      where: {
        tenantCatering: tenantId,
        active: true,
      },
    }),

    // Información del restaurant
    prisma.restaurant.findFirst({
      where: {
        tenantId,
      },
      select: {
        id: true,
        dailyCapacity: true,
        cutoffTime: true,
        operationalDays: true,
        punctualityRate: true,
        incidentRate: true,
        averageRating: true,
        documents: {
          where: {
            expiresAt: {
              gte: new Date(),
              lte: subDays(new Date(), -30), // Próximos a expirar (30 días)
            },
          },
          select: {
            id: true,
            type: true,
            expiresAt: true,
          },
        },
      },
    }),
  ])

  // Calcular KPIs derivados
  const punctualityRate =
    ordersLast30Days > 0
      ? Math.round((ordersDelivered30Days / ordersLast30Days) * 100)
      : 100

  const incidentRate =
    ordersLast30Days > 0
      ? parseFloat(((incidentsLast30Days / ordersLast30Days) * 100).toFixed(2))
      : 0

  // Capacidad utilizada hoy (placeholder, se calculará con producción real)
  const capacityUsed = ordersToday
  const capacityPercentage = restaurant
    ? Math.round((capacityUsed / restaurant.dailyCapacity) * 100)
    : 0

  // ============================================================================
  // ALERTAS
  // ============================================================================

  const alerts = []

  // Alerta: Documentos por expirar
  if (restaurant?.documents && restaurant.documents.length > 0) {
    alerts.push({
      type: 'warning' as const,
      title: 'Documentos próximos a expirar',
      message: `${restaurant.documents.length} documento(s) expiran en los próximos 30 días`,
      actionUrl: '/catering/configuracion',
      actionLabel: 'Ver documentos',
    })
  }

  // Alerta: Incidencias abiertas
  if (incidentsOpen > 5) {
    alerts.push({
      type: 'error' as const,
      title: 'Múltiples incidencias abiertas',
      message: `${incidentsOpen} incidencias pendientes de resolución`,
      actionUrl: '/catering/incidencias',
      actionLabel: 'Ver incidencias',
    })
  }

  // Alerta: Puntualidad baja
  if (punctualityRate < 90) {
    alerts.push({
      type: 'warning' as const,
      title: 'Puntualidad por debajo del objetivo',
      message: `Tasa de puntualidad: ${punctualityRate}% (objetivo: 90%)`,
      actionUrl: '/catering/rutas',
      actionLabel: 'Ver repartos',
    })
  }

  // Alerta: Capacidad alta
  if (capacityPercentage > 90) {
    alerts.push({
      type: 'warning' as const,
      title: 'Capacidad casi al límite',
      message: `Utilizando ${capacityPercentage}% de la capacidad diaria`,
      actionUrl: '/catering/produccion',
      actionLabel: 'Ver producción',
    })
  }

  // Alerta: Sin menús publicados próximos días
  if (menusPublished < 5) {
    alerts.push({
      type: 'info' as const,
      title: 'Menús semanales pendientes',
      message: `Solo ${menusPublished} días con menú publicado`,
      actionUrl: '/catering/menus',
      actionLabel: 'Publicar menús',
    })
  }

  // ============================================================================
  // ACTIVIDAD RECIENTE
  // ============================================================================

  const recentOrders = await prisma.order.findMany({
    where: {
      tenantCatering: tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      serviceDate: true,
      status: true,
      price: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  })

  const recentIncidents = await prisma.incident.findMany({
    where: {
      tenantCatering: tenantId,
    },
    select: {
      id: true,
      type: true,
      severity: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  })

  // ============================================================================
  // RETORNO
  // ============================================================================

  // Rating EN VIVO (no el stored stale de Restaurant), igual que el admin.
  const liveQuality = await getCateringQualityMetrics(tenantId)

  return {
    kpis: {
      production: {
        today: ordersToday,
        thisWeek: ordersThisWeek,
        last30Days: ordersLast30Days,
        capacity: restaurant?.dailyCapacity || 0,
        capacityUsed,
        capacityPercentage,
      },
      dishes: {
        active: dishesActive,
        menusPublished,
      },
      quality: {
        punctualityRate,
        incidentRate,
        averageRating: liveQuality.averageRating,
      },
      incidents: {
        open: incidentsOpen,
        total30Days: incidentsLast30Days,
      },
      companies: {
        assigned: companiesAssigned,
      },
    },
    alerts,
    recentActivity: {
      orders: recentOrders.map((order) => ({
        id: order.id,
        type: 'order' as const,
        serviceDate: order.serviceDate,
        status: order.status,
        price: Number(order.price),
        timestamp: order.createdAt,
      })),
      incidents: recentIncidents.map((incident) => ({
        id: incident.id,
        type: 'incident' as const,
        incidentType: incident.type,
        severity: incident.severity,
        status: incident.status,
        timestamp: incident.createdAt,
      })),
    },
    restaurant: restaurant
      ? {
          cutoffTime: restaurant.cutoffTime,
          dailyCapacity: restaurant.dailyCapacity,
          operationalDays: restaurant.operationalDays,
        }
      : null,
  }
}

