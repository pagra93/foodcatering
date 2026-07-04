/**
 * Queries para gestión completa de Caterings/Restaurantes
 * Incluye: Tenant, Restaurant, Documents, Dishes, Orders, Incidents, Users
 */

import { prisma } from '@/lib/db/prisma'
import { subDays, addDays, startOfDay, endOfDay } from 'date-fns'
import { getCateringQualityMetrics } from '@/lib/db/queries/catering-metrics'

/**
 * KPIs globales reales para la cabecera de la lista de Caterings.
 * Sustituye el mock hardcodeado. Mismo espíritu que getCompaniesGlobalKPIs.
 */
export async function getCateringsGlobalKPIs() {
  const today = new Date()
  const startToday = startOfDay(today)
  const endToday = endOfDay(today)
  const thirtyDaysAgo = subDays(today, 30)
  const in30Days = addDays(today, 30)

  const [
    totalCaterings,
    activeCaterings,
    suspendedCaterings,
    todayOrders,
    confirmedOrders,
    deliveredOrders,
    incidentsToday,
    openIncidents,
    expiringDocs,
    delivered30,
    total30,
    underReviewCaterings,
    ratingAgg,
  ] = await Promise.all([
    prisma.tenant.count({ where: { type: 'CATERING', deletedAt: null } }),
    prisma.tenant.count({ where: { type: 'CATERING', deletedAt: null, status: 'ACTIVE' } }),
    prisma.tenant.count({ where: { type: 'CATERING', deletedAt: null, status: 'SUSPENDED' } }),
    prisma.order.count({ where: { serviceDate: { gte: startToday, lte: endToday }, deletedAt: null } }),
    prisma.order.count({ where: { serviceDate: { gte: startToday, lte: endToday }, status: { in: ['CONFIRMED', 'LOCKED_AFTER_CUTOFF'] }, deletedAt: null } }),
    prisma.order.count({ where: { serviceDate: { gte: startToday, lte: endToday }, status: 'DELIVERED', deletedAt: null } }),
    prisma.incident.count({ where: { createdAt: { gte: startToday, lte: endToday } } }),
    prisma.incident.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.restaurantDocument.count({ where: { expiresAt: { gte: today, lte: in30Days } } }),
    prisma.order.count({ where: { serviceDate: { gte: thirtyDaysAgo }, status: 'DELIVERED', deletedAt: null } }),
    prisma.order.count({ where: { serviceDate: { gte: thirtyDaysAgo }, deletedAt: null } }),
    prisma.restaurant.count({ where: { operationalStatus: 'UNDER_REVIEW' } }),
    prisma.orderRating.aggregate({ _avg: { rating: true } }),
  ])

  return {
    totalCaterings,
    activeCaterings,
    suspendedCaterings,
    underReviewCaterings,
    todayOrders,
    confirmedOrders,
    deliveredOrders,
    incidentsOrders: incidentsToday,
    avgPunctuality: total30 > 0 ? Math.round((delivered30 / total30) * 100) : 100,
    openIncidents,
    expiringDocs,
    avgRating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : 0,
  }
}

/**
 * Obtener información completa de un catering
 * Incluye todo lo necesario para el dashboard de catering
 */
export async function getCateringById(tenantId: string) {
  // Obtener tenant (base)
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId, type: 'CATERING' },
    include: {
      restaurants: {
        include: {
          saasPlan: {
            select: {
              id: true,
              name: true,
              pricingModel: true,
              commissionPct: true,
              flatMonthlyFee: true,
              maxCompanies: true,
            },
          },
          documents: {
            orderBy: { expiresAt: 'asc' },
          },
          dishes: {
            where: { deletedAt: null },
            include: {
              schedules: {
                where: {
                  date: {
                    gte: new Date(),
                  },
                },
                take: 7,
              },
            },
          },
        },
      },
      users: {
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          nameEnc: true,
          role: true,
          mfaEnabled: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
  })

  const restaurant = tenant?.restaurants[0]
  if (!tenant || !restaurant) {
    return null
  }

  // KPIs: Obtener métricas de los últimos 30 y 90 días
  const thirtyDaysAgo = subDays(new Date(), 30)
  const ninetyDaysAgo = subDays(new Date(), 90)
  const [ordersLast30Days, ordersLast90Days, incidents, recentOrders] = await Promise.all([
    // Total de pedidos en los últimos 30 días
    prisma.order.count({
      where: {
        tenantCatering: tenantId,
        serviceDate: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
    }),

    // Total de pedidos en los últimos 90 días
    prisma.order.count({
      where: {
        tenantCatering: tenantId,
        serviceDate: { gte: ninetyDaysAgo },
        deletedAt: null,
      },
    }),

    // Incidencias de los últimos 30 días
    prisma.incident.findMany({
      where: {
        tenantCatering: tenantId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        resolution: true, // JSON con detalles
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    // Pedidos recientes para actividad
    prisma.order.findMany({
      where: {
        tenantCatering: tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        serviceDate: true,
        status: true,
        menuType: true,
        price: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  // Métricas de calidad EN VIVO (fuente única, idéntica a la lista del admin).
  const quality = await getCateringQualityMetrics(tenantId)
  const punctualityRate = quality.punctualityRate
  const incidentRate = quality.incidentRate

  // Demanda media diaria vs capacidad (para alerta de capacidad)
  const avgDailyDemand = ordersLast30Days / 30

  // Cancelaciones post-cutoff (placeholder)
  const postCutoffCancellations = 0

  // Documentos caducados
  const expiredDocs = restaurant.documents.filter(
    (doc) => doc.expiresAt < new Date()
  )

  return {
    // Información base del tenant
    id: tenant.id,
    name: tenant.name,
    subdomain: tenant.subdomain,
    status: tenant.status,
    primaryColor: tenant.primaryColor,
    logoUrl: tenant.logoUrl,
    contactEmail: tenant.contactEmail,
    contactPhone: tenant.contactPhone,
    address: tenant.address,
    city: tenant.city,
    postalCode: tenant.postalCode,
    country: tenant.country,
    timezone: tenant.timezone,
    currency: tenant.currency,
    language: tenant.language,
    notes: tenant.notes,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,

    // Información del restaurante (serializar Decimals)
    restaurant: {
      id: restaurant.id,
      displayName: restaurant.displayName,
      legalName: restaurant.legalName,
      cif: restaurant.cif,
      billingAddress: restaurant.billingAddress,
      iban: restaurant.iban,
      contactPerson: restaurant.contactPerson,
      contactEmail: restaurant.contactEmail,
      contactPhone: restaurant.contactPhone,
      dailyCapacity: restaurant.dailyCapacity,
      preparationWindow: restaurant.preparationWindow,
      deliveryWindow: restaurant.deliveryWindow,
      cutoffTime: restaurant.cutoffTime,
      leadTimeMinutes: restaurant.leadTimeMinutes,
      operationalDays: restaurant.operationalDays,
      zones: restaurant.zones,
      saasPlanId: restaurant.saasPlanId,
      // Cobro de Plati derivado del plan del catering (no de un campo suelto).
      plan: restaurant.saasPlan
        ? {
            id: restaurant.saasPlan.id,
            name: restaurant.saasPlan.name,
            pricingModel: restaurant.saasPlan.pricingModel,
            commissionPct:
              restaurant.saasPlan.commissionPct != null
                ? Number(restaurant.saasPlan.commissionPct)
                : null,
            flatMonthlyFee:
              restaurant.saasPlan.flatMonthlyFee != null
                ? Number(restaurant.saasPlan.flatMonthlyFee)
                : null,
            maxCompanies: restaurant.saasPlan.maxCompanies,
          }
        : null,
      minimumBilling: Number(restaurant.minimumBilling),
      paymentCycle: restaurant.paymentCycle,
      // En vivo (no los stored stale de Restaurant)
      punctualityRate: quality.punctualityRate,
      incidentRate: quality.incidentRate,
      averageRating: quality.averageRating,
      documentsStatus: restaurant.documentsStatus,
      operationalStatus: restaurant.operationalStatus,
      suspendedAt: restaurant.suspendedAt,
      suspendedReason: restaurant.suspendedReason,
    },

    // Documentos
    documents: restaurant.documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      fileUrl: doc.fileUrl,
      issuedAt: doc.issuedAt,
      expiresAt: doc.expiresAt,
      status: doc.status,
      verifiedBy: doc.verifiedBy,
      verifiedAt: doc.verifiedAt,
    })),

    // Platos activos (serializar basePrice)
    dishes: restaurant.dishes.map((dish) => ({
      id: dish.id,
      name: dish.name,
      course: dish.course,
      labels: dish.labels as string[],
      nutrition: dish.nutrition as object,
      basePrice: Number(dish.basePrice),
      active: dish.active,
      scheduledDays: dish.schedules.length,
    })),

    // Usuarios (mapear nameEnc a name)
    users: tenant.users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.nameEnc, // Mapear nameEnc a name para la UI
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      status: user.status,
      createdAt: user.createdAt,
    })),

    // KPIs (estructura compatible con componentes)
    kpis: {
      ordersLast30Days,
      ordersLast90Days,
      punctualityRate,
      incidentRate,
      averageRating: quality.averageRating,
      ratingCount: quality.ratingCount,
      incidentsCount: incidents.length,
      postCutoffCancellations,
    },

    // Alertas (estructura compatible con componentes)
    alerts: {
      expiredDocs: expiredDocs.map((doc) => ({
        id: doc.id,
        type: doc.type,
        expiresAt: doc.expiresAt,
        status: doc.status,
      })),
      criticalIncidents: incidents
        .filter((inc) => inc.severity === 'HIGH' && inc.status === 'OPEN')
        .map((inc) => ({
          id: inc.id,
          severity: inc.severity,
          type: inc.type,
        })),
      lowPunctuality: punctualityRate < 90,
      highIncidentRate: incidentRate > 5,
      capacityNearLimit:
        restaurant.dailyCapacity > 0 &&
        avgDailyDemand >= restaurant.dailyCapacity * 0.9,
    },

    // Actividad reciente
    recentOrders,

    // Incidencias
    incidents,
  }
}

/**
 * Obtener lista de caterings con filtros
 */
export async function getCaterings({
  page = 1,
  pageSize = 20,
  search,
  status,
}: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  operationalStatus?: string
  documentsStatus?: string
}) {
  const where: any = {
    type: 'CATERING',
    deletedAt: null,
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { subdomain: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (status) {
    where.status = status
  }

  const [caterings, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        restaurants: {
          include: {
            saasPlan: {
              select: {
                name: true,
                pricingModel: true,
                commissionPct: true,
                flatMonthlyFee: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tenant.count({ where }),
  ])

  return {
    caterings,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

/**
 * Crear un catering completo
 */
export async function createCatering(data: {
  // Tenant
  name: string
  subdomain: string
  contactEmail?: string
  contactPhone?: string
  primaryColor?: string
  logoUrl?: string
  
  // Restaurant
  legalName: string
  cif: string
  billingAddress: string
  iban?: string
  contactPerson: string
  restaurantContactEmail: string
  restaurantContactPhone: string
  dailyCapacity: number
  cutoffTime: string
  operationalDays: string[]
  zones: Array<{
    name: string
    postalCodes: string[]
    maxDistance: number
    operator: string
  }>
  saasPlanId?: string | null

  // Regional
  timezone?: string
  currency?: string
  language?: string
}) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Crear Tenant
    const tenant = await tx.tenant.create({
      data: {
        type: 'CATERING',
        name: data.name,
        subdomain: data.subdomain,
        status: 'ACTIVE',
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        primaryColor: data.primaryColor,
        logoUrl: data.logoUrl,
        timezone: data.timezone || 'Europe/Madrid',
        currency: data.currency || 'EUR',
        language: data.language || 'es',
      },
    })

    // 2. Crear Restaurant
    const restaurant = await tx.restaurant.create({
      data: {
        tenantId: tenant.id,
        displayName: data.name,
        legalName: data.legalName,
        cif: data.cif,
        billingAddress: data.billingAddress,
        iban: data.iban,
        contactPerson: data.contactPerson,
        contactEmail: data.restaurantContactEmail,
        contactPhone: data.restaurantContactPhone,
        dailyCapacity: data.dailyCapacity,
        cutoffTime: data.cutoffTime,
        operationalDays: data.operationalDays,
        zones: data.zones,
        saasPlanId: data.saasPlanId ?? null,
        operationalStatus: 'UNDER_REVIEW', // Requiere revisión inicial
      },
    })

    return { tenant, restaurant }
  })

  return result.tenant
}

/**
 * Actualizar un catering
 */
export async function updateCatering(
  tenantId: string,
  data: Partial<{
    name: string
    contactEmail: string
    contactPhone: string
    primaryColor: string
    logoUrl: string
    legalName: string
    billingAddress: string
    iban: string
    contactPerson: string
    restaurantContactEmail: string
    restaurantContactPhone: string
    dailyCapacity: number
    cutoffTime: string
    operationalDays: string[]
    zones: any
    saasPlanId: string | null
  }>
) {
  await prisma.$transaction(async (tx) => {
    // 1. Actualizar Tenant
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        primaryColor: data.primaryColor,
        logoUrl: data.logoUrl,
      },
    })

    // 2. Actualizar Restaurant
    const restaurant = await tx.restaurant.findFirst({
      where: { tenantId },
    })

    if (restaurant) {
      await tx.restaurant.update({
        where: { id: restaurant.id },
        data: {
          legalName: data.legalName,
          billingAddress: data.billingAddress,
          iban: data.iban,
          contactPerson: data.contactPerson,
          contactEmail: data.restaurantContactEmail,
          contactPhone: data.restaurantContactPhone,
          dailyCapacity: data.dailyCapacity,
          cutoffTime: data.cutoffTime,
          operationalDays: data.operationalDays,
          zones: data.zones,
          saasPlanId: data.saasPlanId,
        },
      })
    }
  })
}

