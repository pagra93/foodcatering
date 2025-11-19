/**
 * Queries para Gestión de Rutas del Catering
 * 
 * CRUD de rutas, asignación de repartidores, tracking
 */

import { prisma } from '@/lib/db/prisma'
import type { CreateRouteInput, UpdateRouteInput } from '@/lib/validations/delivery'
import { startOfDay, endOfDay } from 'date-fns'

/**
 * Crear una nueva ruta
 */
export async function createRoute(tenantId: string, data: CreateRouteInput) {
  return await prisma.$transaction(async (tx) => {
    // Verificar que las sedes existen y pertenecen al tenant
    const sites = await tx.companySite.findMany({
      where: {
        id: { in: data.companySiteIds },
        company: {
          tenantId,
        },
      },
    })

    if (sites.length !== data.companySiteIds.length) {
      throw new Error('Algunas sedes no existen o no pertenecen a este tenant')
    }

    // Si hay repartidor, verificar que existe
    if (data.deliveryUserId) {
      const driver = await tx.user.findFirst({
        where: {
          id: data.deliveryUserId,
          tenantId,
          role: 'REPARTIDOR',
        },
      })

      if (!driver) {
        throw new Error('Repartidor no encontrado')
      }
    }

    // Crear la ruta
    const route = await tx.deliveryRoute.create({
      data: {
        tenantId,
        name: data.name,
        date: startOfDay(data.date),
        deliveryUserId: data.deliveryUserId,
        estimatedDuration: data.estimatedDuration,
        notes: data.notes,
        status: 'PENDING',
      },
    })

    // Asociar las sedes a la ruta
    await tx.deliveryRouteSite.createMany({
      data: data.companySiteIds.map((siteId, index) => ({
        routeId: route.id,
        companySiteId: siteId,
        sequence: index + 1,
      })),
    })

    // Obtener pedidos confirmados de esas sedes para esa fecha
    const orders = await tx.order.findMany({
      where: {
        tenantId,
        companySiteId: { in: data.companySiteIds },
        serviceDate: {
          gte: startOfDay(data.date),
          lte: endOfDay(data.date),
        },
        status: 'CONFIRMED',
      },
    })

    // Asignar pedidos a la ruta
    if (orders.length > 0) {
      await tx.order.updateMany({
        where: {
          id: { in: orders.map((o) => o.id) },
        },
        data: {
          routeId: route.id,
        },
      })
    }

    return {
      ...route,
      totalOrders: orders.length,
      sites: sites.map((s) => s.name),
    }
  })
}

/**
 * Obtener rutas con filtros
 */
export async function getRoutes(
  tenantId: string,
  filters?: {
    date?: Date
    status?: string
    deliveryUserId?: string
  }
) {
  const whereClause: any = {
    tenantId,
  }

  if (filters?.date) {
    whereClause.date = {
      gte: startOfDay(filters.date),
      lte: endOfDay(filters.date),
    }
  }

  if (filters?.status) {
    whereClause.status = filters.status
  }

  if (filters?.deliveryUserId) {
    whereClause.deliveryUserId = filters.deliveryUserId
  }

  const routes = await prisma.deliveryRoute.findMany({
    where: whereClause,
    include: {
      deliveryUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      sites: {
        include: {
          companySite: {
            select: {
              id: true,
              name: true,
              address: true,
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          sequence: 'asc',
        },
      },
      _count: {
        select: {
          orders: true,
        },
      },
    },
    orderBy: [
      { date: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  return routes.map((route) => ({
    id: route.id,
    name: route.name,
    date: route.date,
    status: route.status,
    deliveryUser: route.deliveryUser,
    totalOrders: route._count.orders,
    totalSites: route.sites.length,
    sites: route.sites.map((rs) => ({
      id: rs.companySite.id,
      name: rs.companySite.name,
      address: rs.companySite.address,
      company: rs.companySite.company,
      sequence: rs.sequence,
    })),
    estimatedDuration: route.estimatedDuration,
    startedAt: route.startedAt,
    completedAt: route.completedAt,
    notes: route.notes,
    createdAt: route.createdAt,
  }))
}

/**
 * Obtener una ruta por ID
 */
export async function getRouteById(tenantId: string, routeId: string) {
  const route = await prisma.deliveryRoute.findFirst({
    where: {
      id: routeId,
      tenantId,
    },
    include: {
      deliveryUser: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      sites: {
        include: {
          companySite: {
            select: {
              id: true,
              name: true,
              address: true,
              contactName: true,
              contactPhone: true,
              latitude: true,
              longitude: true,
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          sequence: 'asc',
        },
      },
      orders: {
        where: {
          deletedAt: null,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          companySite: {
            select: {
              id: true,
              name: true,
            },
          },
          deliveryProof: true,
        },
        orderBy: [
          {
            companySite: {
              name: 'asc',
            },
          },
          {
            employee: {
              lastName: 'asc',
            },
          },
        ],
      },
      events: {
        orderBy: {
          timestamp: 'asc',
        },
      },
    },
  })

  if (!route) {
    return null
  }

  return {
    ...route,
    totalOrders: route.orders.length,
    deliveredOrders: route.orders.filter((o) => o.status === 'DELIVERED').length,
    pendingOrders: route.orders.filter((o) => o.status === 'CONFIRMED').length,
    incidentOrders: route.orders.filter((o) => o.status === 'ISSUE_REPORTED').length,
  }
}

/**
 * Actualizar una ruta
 */
export async function updateRoute(
  tenantId: string,
  routeId: string,
  data: UpdateRouteInput
) {
  // Verificar que la ruta existe
  const route = await prisma.deliveryRoute.findFirst({
    where: {
      id: routeId,
      tenantId,
    },
  })

  if (!route) {
    throw new Error('Ruta no encontrada')
  }

  // Si se cambia el repartidor, verificar que existe
  if (data.deliveryUserId) {
    const driver = await prisma.user.findFirst({
      where: {
        id: data.deliveryUserId,
        tenantId,
        role: 'REPARTIDOR',
      },
    })

    if (!driver) {
      throw new Error('Repartidor no encontrado')
    }
  }

  const updated = await prisma.deliveryRoute.update({
    where: { id: routeId },
    data: {
      name: data.name,
      deliveryUserId: data.deliveryUserId,
      status: data.status,
      estimatedDuration: data.estimatedDuration,
      notes: data.notes,
    },
  })

  return updated
}

/**
 * Asignar repartidor a una ruta
 */
export async function assignDriverToRoute(
  tenantId: string,
  routeId: string,
  deliveryUserId: string
) {
  // Verificar repartidor
  const driver = await prisma.user.findFirst({
    where: {
      id: deliveryUserId,
      tenantId,
      role: 'REPARTIDOR',
    },
  })

  if (!driver) {
    throw new Error('Repartidor no encontrado')
  }

  const updated = await prisma.deliveryRoute.update({
    where: { id: routeId },
    data: {
      deliveryUserId,
    },
  })

  return updated
}

/**
 * Iniciar una ruta
 */
export async function startRoute(tenantId: string, routeId: string) {
  const route = await prisma.deliveryRoute.findFirst({
    where: {
      id: routeId,
      tenantId,
    },
    include: {
      orders: true,
    },
  })

  if (!route) {
    throw new Error('Ruta no encontrada')
  }

  if (route.status !== 'PENDING') {
    throw new Error('La ruta ya está en curso o completada')
  }

  if (!route.deliveryUserId) {
    throw new Error('No hay repartidor asignado')
  }

  if (!route.orders || route.orders.length === 0) {
    throw new Error('No hay pedidos en la ruta')
  }

  return await prisma.$transaction(async (tx) => {
    // Actualizar ruta
    const updated = await tx.deliveryRoute.update({
      where: { id: routeId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    })

    // Crear evento
    await tx.deliveryEvent.create({
      data: {
        routeId,
        type: 'ROUTE_STARTED',
        timestamp: new Date(),
        metadata: {
          userId: route.deliveryUserId,
        },
      },
    })

    return updated
  })
}

/**
 * Completar una ruta
 */
export async function completeRoute(
  tenantId: string,
  routeId: string,
  notes?: string
) {
  const route = await prisma.deliveryRoute.findFirst({
    where: {
      id: routeId,
      tenantId,
    },
    include: {
      orders: true,
    },
  })

  if (!route) {
    throw new Error('Ruta no encontrada')
  }

  if (route.status !== 'IN_PROGRESS') {
    throw new Error('La ruta no está en curso')
  }

  const allDelivered = route.orders.every(
    (order) => order.status === 'DELIVERED' || order.status === 'ISSUE_REPORTED'
  )

  if (!allDelivered) {
    throw new Error('Aún hay pedidos sin entregar')
  }

  return await prisma.$transaction(async (tx) => {
    // Actualizar ruta
    const updated = await tx.deliveryRoute.update({
      where: { id: routeId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes: notes || route.notes,
      },
    })

    // Crear evento
    await tx.deliveryEvent.create({
      data: {
        routeId,
        type: 'ROUTE_COMPLETED',
        timestamp: new Date(),
        metadata: {
          totalOrders: route.orders.length,
          deliveredOrders: route.orders.filter((o) => o.status === 'DELIVERED').length,
          incidentOrders: route.orders.filter((o) => o.status === 'ISSUE_REPORTED')
            .length,
        },
      },
    })

    return updated
  })
}

/**
 * Cancelar una ruta
 */
export async function cancelRoute(
  tenantId: string,
  routeId: string,
  reason?: string
) {
  const route = await prisma.deliveryRoute.findFirst({
    where: {
      id: routeId,
      tenantId,
    },
  })

  if (!route) {
    throw new Error('Ruta no encontrada')
  }

  if (route.status === 'COMPLETED') {
    throw new Error('No se puede cancelar una ruta completada')
  }

  return await prisma.$transaction(async (tx) => {
    // Actualizar ruta
    const updated = await tx.deliveryRoute.update({
      where: { id: routeId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${route.notes || ''}\nCANCELADA: ${reason}` : route.notes,
      },
    })

    // Crear evento
    await tx.deliveryEvent.create({
      data: {
        routeId,
        type: 'ROUTE_CANCELLED',
        timestamp: new Date(),
        metadata: {
          reason,
        },
      },
    })

    // Desasignar pedidos de la ruta
    await tx.order.updateMany({
      where: { routeId },
      data: { routeId: null },
    })

    return updated
  })
}

/**
 * Obtener estadísticas de rutas
 */
export async function getRoutesStats(tenantId: string, date?: Date) {
  const whereClause: any = { tenantId }

  if (date) {
    whereClause.date = {
      gte: startOfDay(date),
      lte: endOfDay(date),
    }
  }

  const [total, pending, inProgress, completed, totalOrders] = await Promise.all([
    prisma.deliveryRoute.count({ where: whereClause }),
    prisma.deliveryRoute.count({ where: { ...whereClause, status: 'PENDING' } }),
    prisma.deliveryRoute.count({ where: { ...whereClause, status: 'IN_PROGRESS' } }),
    prisma.deliveryRoute.count({ where: { ...whereClause, status: 'COMPLETED' } }),
    prisma.order.count({
      where: {
        tenantId,
        route: whereClause.date
          ? {
              date: whereClause.date,
            }
          : undefined,
      },
    }),
  ])

  return {
    total,
    pending,
    inProgress,
    completed,
    cancelled: total - pending - inProgress - completed,
    totalOrders,
  }
}

/**
 * Obtener repartidores disponibles
 */
export async function getAvailableDrivers(tenantId: string, date: Date) {
  // Obtener todos los repartidores activos
  const allDrivers = await prisma.user.findMany({
    where: {
      tenantId,
      role: 'REPARTIDOR',
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  })

  // Obtener rutas del día
  const routesOfDay = await prisma.deliveryRoute.findMany({
    where: {
      tenantId,
      date: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
    select: {
      deliveryUserId: true,
    },
  })

  const assignedDriverIds = routesOfDay
    .map((r) => r.deliveryUserId)
    .filter((id): id is string => id !== null)

  // Marcar quiénes están disponibles
  return allDrivers.map((driver) => ({
    ...driver,
    isAvailable: !assignedDriverIds.includes(driver.id),
  }))
}

