/**
 * Queries para gestión de Catering y Menús en Portal Empresa
 * Información del catering asignado, menús, SLA, valoraciones
 */

import { prisma } from '@/lib/db/prisma'
import { startOfMonth, subDays } from 'date-fns'

// ============================================================================
// OBTENER CATERING ASIGNADO
// ============================================================================

export async function getAssignedCatering(tenantId: string) {
  // Primero obtener el company.id desde tenantId
  const company = await prisma.company.findUnique({
    where: { tenantId },
    select: { id: true },
  })

  if (!company) {
    return null
  }

  // Obtener asignación activa principal
  const assignment = await prisma.companyCateringAssignment.findFirst({
    where: {
      tenantEmpresa: tenantId, // filtro de tenant (F5)
      companyId: company.id,
      active: true,
      type: 'PRIMARY',
    },
  })

  if (!assignment) {
    return null
  }

  // Obtener el restaurant por separado usando tenantCatering
  const restaurant = await prisma.restaurant.findUnique({
    where: { tenantId: assignment.tenantCatering },
    select: {
      id: true,
      tenantId: true,
      displayName: true,
      legalName: true,
      cif: true,
      billingAddress: true,
      contactPerson: true,
      contactEmail: true,
      contactPhone: true,
      dailyCapacity: true,
      cutoffTime: true,
      preparationWindow: true,
      deliveryWindow: true,
      zones: true,
    },
  })

  // Calcular métricas de SLA (últimos 30 días)
  const thirtyDaysAgo = subDays(new Date(), 30)
  
  const [totalOrders, deliveredOnTime, incidents, avgRating] = await Promise.all([
    // Total de pedidos
    prisma.order.count({
      where: {
        tenantEmpresa: tenantId,
        tenantCatering: assignment.tenantCatering,
        serviceDate: { gte: thirtyDaysAgo },
        status: { in: ['DELIVERED', 'NO_SHOW'] },
      },
    }),

    // Pedidos entregados a tiempo
    prisma.order.count({
      where: {
        tenantEmpresa: tenantId,
        tenantCatering: assignment.tenantCatering,
        serviceDate: { gte: thirtyDaysAgo },
        status: 'DELIVERED',
      },
    }),

    // Incidencias
    prisma.incident.count({
      where: {
        tenantEmpresa: tenantId,
        tenantCatering: assignment.tenantCatering,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),

    // Valoración promedio
    prisma.orderRating.aggregate({
      where: {
        order: {
          tenantEmpresa: tenantId,
          tenantCatering: assignment.tenantCatering,
          serviceDate: { gte: thirtyDaysAgo },
        },
      },
      _avg: { rating: true },
    }),
  ])

  const punctualityRate = totalOrders > 0 ? (deliveredOnTime / totalOrders) * 100 : 0
  const incidentRate = totalOrders > 0 ? (incidents / totalOrders) * 100 : 0

  return {
    assignment: {
      id: assignment.id,
      type: assignment.type,
      zones: assignment.zones,
      priority: assignment.priority,
      assignedAt: assignment.assignedAt,
    },
    restaurant,
    metrics: {
      totalOrders,
      deliveredOnTime,
      punctualityRate: Math.round(punctualityRate * 10) / 10,
      incidents,
      incidentRate: Math.round(incidentRate * 10) / 10,
      avgRating: avgRating._avg.rating ? Number(avgRating._avg.rating) : null,
      slaPunctuality: assignment.slaPunctuality,
      slaIncidentRate: assignment.slaIncidentRate,
    },
  }
}

// ============================================================================
// OBTENER MENÚS DE LA SEMANA
// ============================================================================

type DayMenu = {
  date: Date
  starters: DishEntry[]
  mains: DishEntry[]
  desserts: DishEntry[]
}

type DishEntry = {
  scheduleId: string
  dishId: string
  name: string
  course: string
  price: number
  labels: unknown
  nutrition: unknown
  stockLimit: number | null
  priceOverride: number | null
}

export async function getWeeklyMenus(cateringTenantId: string, startDate: Date, endDate: Date) {
  // Schedules publicados del catering en el rango
  const schedules = await prisma.dishSchedule.findMany({
    where: {
      tenantId: cateringTenantId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: 'PUBLISHED',
      dish: {
        active: true,
      },
    },
    include: {
      dish: {
        select: {
          id: true,
          name: true,
          course: true,
          basePrice: true,
          labels: true,
          nutrition: true,
          active: true,
        },
      },
    },
    orderBy: [
      { date: 'asc' },
      { dish: { course: 'asc' } },
    ],
  })

  const menusByDate = schedules.reduce<Record<string, DayMenu>>((acc, schedule) => {
    const dateKey = schedule.date.toISOString().split('T')[0] ?? schedule.date.toISOString()

    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: schedule.date,
        starters: [],
        mains: [],
        desserts: [],
      }
    }
    const bucket = acc[dateKey]!

    const dishData: DishEntry = {
      scheduleId: schedule.id,
      dishId: schedule.dish.id,
      name: schedule.dish.name,
      course: schedule.dish.course,
      price: Number(schedule.priceOverride ?? schedule.dish.basePrice),
      labels: schedule.dish.labels,
      nutrition: schedule.dish.nutrition,
      stockLimit: schedule.stockLimit,
      priceOverride: schedule.priceOverride ? Number(schedule.priceOverride) : null,
    }

    switch (schedule.dish.course) {
      case 'FIRST':
        bucket.starters.push(dishData)
        break
      case 'SECOND':
        bucket.mains.push(dishData)
        break
      case 'DESSERT':
        bucket.desserts.push(dishData)
        break
    }

    return acc
  }, {})

  return Object.values(menusByDate)
}

// ============================================================================
// OBTENER VALORACIONES DE EMPLEADOS
// ============================================================================

export async function getCateringRatings(
  tenantId: string,
  cateringId: string,
  page: number = 1,
  pageSize: number = 10
) {
  const [ratings, total] = await Promise.all([
    prisma.orderRating.findMany({
      where: {
        order: {
          tenantEmpresa: tenantId,
          tenantCatering: cateringId,
        },
      },
      select: {
        id: true,
        rating: true,
        tasteRating: true,
        portionRating: true,
        presentationRating: true,
        comment: true,
        createdAt: true,
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            user: {
              select: {
                nameEnc: true,
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            serviceDate: true,
            menuType: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),

    prisma.orderRating.count({
      where: {
        order: {
          tenantEmpresa: tenantId,
          tenantCatering: cateringId,
        },
      },
    }),
  ])

  return {
    ratings: ratings.map((r) => ({
      id: r.id,
      rating: r.rating,
      tasteRating: r.tasteRating,
      portionRating: r.portionRating,
      presentationRating: r.presentationRating,
      comment: r.comment,
      createdAt: r.createdAt,
      employee: {
        id: r.employee.id,
        name: r.employee.user.nameEnc,
        employeeNumber: r.employee.employeeNumber,
      },
      order: r.order,
    })),
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

// ============================================================================
// OBTENER INCIDENCIAS CON CATERING
// ============================================================================

export async function getCateringIncidents(
  tenantId: string,
  cateringId: string,
  filters: {
    status?: string
    severity?: string
    page?: number
    pageSize?: number
  } = {}
) {
  const { status, severity, page = 1, pageSize = 20 } = filters

  const where: any = {
    tenantEmpresa: tenantId,
    tenantCatering: cateringId,
  }

  if (status && status !== 'all') {
    where.status = status
  }

  if (severity && severity !== 'all') {
    where.severity = severity
  }

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        openedBy: true,
        assignedTo: true,
        resolution: true,
        createdAt: true,
        resolvedAt: true,
        order: {
          select: {
            id: true,
            serviceDate: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),

    prisma.incident.count({ where }),
  ])

  return {
    incidents,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

// ============================================================================
// OBTENER MÉTRICAS DETALLADAS DE SLA
// ============================================================================

export async function getCateringSLAMetrics(tenantId: string, cateringId: string) {
  const thirtyDaysAgo = subDays(new Date(), 30)
  const thisMonth = startOfMonth(new Date())

  const [
    last30Days,
    thisMonthData,
    incidentsByType,
    ratingDistribution,
  ] = await Promise.all([
    // Últimos 30 días
    prisma.order.groupBy({
      by: ['status'],
      where: {
        tenantEmpresa: tenantId,
        tenantCatering: cateringId,
        serviceDate: { gte: thirtyDaysAgo },
      },
      _count: true,
    }),

    // Este mes
    prisma.order.groupBy({
      by: ['status'],
      where: {
        tenantEmpresa: tenantId,
        tenantCatering: cateringId,
        serviceDate: { gte: thisMonth },
      },
      _count: true,
    }),

    // Incidencias por tipo
    prisma.incident.groupBy({
      by: ['type'],
      where: {
        tenantEmpresa: tenantId,
        tenantCatering: cateringId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
    }),

    // Distribución de valoraciones
    prisma.orderRating.groupBy({
      by: ['rating'],
      where: {
        order: {
          tenantEmpresa: tenantId,
          tenantCatering: cateringId,
          serviceDate: { gte: thirtyDaysAgo },
        },
      },
      _count: true,
    }),
  ])

  return {
    last30Days: last30Days.map((item) => ({
      status: item.status,
      count: item._count,
    })),
    thisMonth: thisMonthData.map((item) => ({
      status: item.status,
      count: item._count,
    })),
    incidentsByType: incidentsByType.map((item) => ({
      type: item.type,
      count: item._count,
    })),
    ratingDistribution: ratingDistribution.map((item) => ({
      rating: item.rating,
      count: item._count,
    })),
  }
}

