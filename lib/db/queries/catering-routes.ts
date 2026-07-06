/**
 * Queries para Gestión de Rutas del Catering
 *
 * CRUD de rutas, asignación de repartidores, tracking.
 * El `tenantId` de estas funciones es siempre el tenant del CATERING.
 */

import { prisma } from '@/lib/db/prisma'
import type { CreateRouteInput, UpdateRouteInput } from '@/lib/validations/delivery'
import { startOfDay, endOfDay } from 'date-fns'

/**
 * Crear una nueva ruta
 */
export async function createRoute(tenantId: string, data: CreateRouteInput) {
  return prisma.$transaction(async (tx) => {
    // Sólo se aceptan sedes de empresas asignadas (activas) a este catering.
    // Antes sólo se comprobaba que la sede existiera, lo que permitía a un
    // catering enlazar (y luego leer vía getRouteById) sedes de empresas que no
    // son sus clientes.
    const assigned = await tx.companyCateringAssignment.findMany({
      where: { tenantCatering: tenantId, active: true },
      select: { companyId: true },
    })
    const assignedCompanyIds = assigned.map((a) => a.companyId)

    const sites = await tx.companySite.findMany({
      where: {
        id: { in: data.companySiteIds },
        companyId: { in: assignedCompanyIds },
      },
      select: { id: true, name: true },
    })

    if (sites.length !== data.companySiteIds.length) {
      throw new Error(
        'Alguna sede no pertenece a una empresa cliente de este catering'
      )
    }

    // Si hay repartidor, verificar que pertenece al catering y tiene el rol correcto
    if (data.deliveryUserId) {
      const driver = await tx.user.findFirst({
        where: {
          id: data.deliveryUserId,
          tenantId,
          role: 'REPARTIDOR',
          status: 'ACTIVE',
        },
      })

      if (!driver) {
        throw new Error('Repartidor no encontrado')
      }
    }

    const route = await tx.deliveryRoute.create({
      data: {
        tenantId,
        name: data.name,
        date: startOfDay(data.date),
        deliveryUserId: data.deliveryUserId ?? null,
        estimatedDuration: data.estimatedDuration ?? null,
        notes: data.notes ?? null,
        status: 'PENDING',
      },
    })

    await tx.deliveryRouteSite.createMany({
      data: data.companySiteIds.map((siteId, index) => ({
        routeId: route.id,
        companySiteId: siteId,
        sequence: index + 1,
      })),
    })

    // Pedidos del catering para esas sedes y fecha
    const orders = await tx.order.findMany({
      where: {
        tenantCatering: tenantId,
        siteId: { in: data.companySiteIds },
        serviceDate: {
          gte: startOfDay(data.date),
          lte: endOfDay(data.date),
        },
        status: 'CONFIRMED',
      },
      select: { id: true },
    })

    if (orders.length > 0) {
      await tx.order.updateMany({
        where: { id: { in: orders.map((o) => o.id) } },
        data: { routeId: route.id },
      })
    }

    return {
      ...route,
      totalOrders: orders.length,
      sites: sites.map((s) => s.name),
    }
  })
}

type RouteFilters = {
  date?: Date
  status?: string
  deliveryUserId?: string
}

/**
 * Listar rutas con filtros
 */
export async function getRoutes(tenantId: string, filters?: RouteFilters) {
  const where: {
    tenantId: string
    date?: { gte: Date; lte: Date }
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    deliveryUserId?: string
  } = { tenantId }

  if (filters?.date) {
    where.date = { gte: startOfDay(filters.date), lte: endOfDay(filters.date) }
  }
  if (filters?.status) {
    where.status = filters.status as typeof where.status
  }
  if (filters?.deliveryUserId) {
    where.deliveryUserId = filters.deliveryUserId
  }

  const routes = await prisma.deliveryRoute.findMany({
    where,
    include: {
      deliveryUser: {
        select: { id: true, nameEnc: true, email: true },
      },
      sites: {
        include: {
          companySite: {
            select: {
              id: true,
              name: true,
              address: true,
              company: { select: { id: true, legalName: true } },
            },
          },
        },
        orderBy: { sequence: 'asc' },
      },
      _count: { select: { orders: true } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })

  return routes.map((route) => ({
    id: route.id,
    name: route.name,
    date: route.date,
    status: route.status,
    deliveryUser: route.deliveryUser
      ? {
          id: route.deliveryUser.id,
          name: route.deliveryUser.nameEnc,
          email: route.deliveryUser.email,
        }
      : null,
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
 * Obtener una ruta por id
 */
export async function getRouteById(tenantId: string, routeId: string) {
  const route = await prisma.deliveryRoute.findFirst({
    where: { id: routeId, tenantId },
    include: {
      deliveryUser: {
        select: { id: true, nameEnc: true, email: true, phoneEnc: true },
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
              company: { select: { id: true, legalName: true } },
            },
          },
        },
        orderBy: { sequence: 'asc' },
      },
      orders: {
        where: { deletedAt: null },
        include: { deliveryProof: true },
      },
      events: { orderBy: { timestamp: 'asc' } },
    },
  })

  if (!route) {
    return null
  }

  // Enriquecer pedidos con info del empleado (Order no tiene relación con Employee)
  const employeeIds = Array.from(new Set(route.orders.map((o) => o.employeeId)))
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    include: { user: { select: { nameEnc: true, phoneEnc: true } } },
  })
  const employeeMap = new Map(employees.map((e) => [e.id, e]))

  const orders = route.orders.map((o) => {
    const emp = employeeMap.get(o.employeeId)
    return {
      ...o,
      employee: emp
        ? {
            id: emp.id,
            name: emp.user.nameEnc,
            phone: emp.user.phoneEnc,
          }
        : null,
    }
  })

  return {
    ...route,
    orders,
    totalOrders: route.orders.length,
    deliveredOrders: route.orders.filter((o) => o.status === 'DELIVERED').length,
    pendingOrders: route.orders.filter((o) => o.status === 'CONFIRMED').length,
    incidentOrders: route.orders.filter((o) => o.status === 'ISSUE_REPORTED').length,
  }
}

/**
 * Actualizar datos básicos de una ruta
 */
export async function updateRoute(tenantId: string, routeId: string, data: UpdateRouteInput) {
  const route = await prisma.deliveryRoute.findFirst({
    where: { id: routeId, tenantId },
  })

  if (!route) {
    throw new Error('Ruta no encontrada')
  }

  if (data.deliveryUserId) {
    const driver = await prisma.user.findFirst({
      where: {
        id: data.deliveryUserId,
        tenantId,
        role: 'REPARTIDOR',
        status: 'ACTIVE',
      },
    })

    if (!driver) {
      throw new Error('Repartidor no encontrado')
    }
  }

  return prisma.deliveryRoute.update({
    where: { id: routeId },
    data: {
      name: data.name ?? undefined,
      deliveryUserId: data.deliveryUserId ?? undefined,
      status: data.status ?? undefined,
      estimatedDuration: data.estimatedDuration ?? undefined,
      notes: data.notes ?? undefined,
    },
  })
}

/**
 * Asignar repartidor a una ruta
 */
export async function assignDriverToRoute(
  tenantId: string,
  routeId: string,
  deliveryUserId: string
) {
  // La ruta debe pertenecer al tenant que la modifica (L8: evita reasignar el
  // repartidor de una ruta de otro catering conociendo su id).
  const route = await prisma.deliveryRoute.findFirst({
    where: { id: routeId, tenantId },
    select: { id: true },
  })
  if (!route) {
    throw new Error('Ruta no encontrada')
  }

  const driver = await prisma.user.findFirst({
    where: {
      id: deliveryUserId,
      tenantId,
      role: 'REPARTIDOR',
      status: 'ACTIVE',
    },
  })

  if (!driver) {
    throw new Error('Repartidor no encontrado')
  }

  return prisma.deliveryRoute.update({
    where: { id: routeId },
    data: { deliveryUserId },
  })
}

/**
 * Iniciar una ruta
 */
export async function startRoute(tenantId: string, routeId: string) {
  const route = await prisma.deliveryRoute.findFirst({
    where: { id: routeId, tenantId },
    include: { orders: true },
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

  if (route.orders.length === 0) {
    throw new Error('No hay pedidos en la ruta')
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.deliveryRoute.update({
      where: { id: routeId },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    })

    await tx.deliveryRouteEvent.create({
      data: {
        routeId,
        type: 'ROUTE_STARTED',
        timestamp: new Date(),
        metadata: { userId: route.deliveryUserId },
      },
    })

    return updated
  })
}

/**
 * Completar una ruta
 */
export async function completeRoute(tenantId: string, routeId: string, notes?: string) {
  const route = await prisma.deliveryRoute.findFirst({
    where: { id: routeId, tenantId },
    include: { orders: true },
  })

  if (!route) {
    throw new Error('Ruta no encontrada')
  }

  if (route.status !== 'IN_PROGRESS') {
    throw new Error('La ruta no está en curso')
  }

  const allDelivered = route.orders.every(
    (o) => o.status === 'DELIVERED' || o.status === 'ISSUE_REPORTED'
  )

  if (!allDelivered) {
    throw new Error('Aún hay pedidos sin entregar')
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.deliveryRoute.update({
      where: { id: routeId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes: notes ?? route.notes,
      },
    })

    await tx.deliveryRouteEvent.create({
      data: {
        routeId,
        type: 'ROUTE_COMPLETED',
        timestamp: new Date(),
        metadata: {
          totalOrders: route.orders.length,
          deliveredOrders: route.orders.filter((o) => o.status === 'DELIVERED').length,
          incidentOrders: route.orders.filter((o) => o.status === 'ISSUE_REPORTED').length,
        },
      },
    })

    return updated
  })
}

/**
 * Cancelar una ruta
 */
export async function cancelRoute(tenantId: string, routeId: string, reason?: string) {
  const route = await prisma.deliveryRoute.findFirst({
    where: { id: routeId, tenantId },
  })

  if (!route) {
    throw new Error('Ruta no encontrada')
  }

  if (route.status === 'COMPLETED') {
    throw new Error('No se puede cancelar una ruta completada')
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.deliveryRoute.update({
      where: { id: routeId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${route.notes ?? ''}\nCANCELADA: ${reason}`.trim() : route.notes,
      },
    })

    await tx.deliveryRouteEvent.create({
      data: {
        routeId,
        type: 'ROUTE_CANCELLED',
        timestamp: new Date(),
        metadata: { reason: reason ?? null },
      },
    })

    await tx.order.updateMany({
      where: { routeId },
      data: { routeId: null },
    })

    return updated
  })
}

/**
 * Estadísticas de rutas
 */
export async function getRoutesStats(tenantId: string, date?: Date) {
  const dateFilter = date
    ? { gte: startOfDay(date), lte: endOfDay(date) }
    : undefined

  const baseWhere = { tenantId, ...(dateFilter ? { date: dateFilter } : {}) }

  const [total, pending, inProgress, completed, totalOrders] = await Promise.all([
    prisma.deliveryRoute.count({ where: baseWhere }),
    prisma.deliveryRoute.count({ where: { ...baseWhere, status: 'PENDING' } }),
    prisma.deliveryRoute.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
    prisma.deliveryRoute.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
    prisma.order.count({
      where: {
        tenantCatering: tenantId,
        routeId: { not: null },
        ...(dateFilter ? { serviceDate: dateFilter } : {}),
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
 * Listar repartidores disponibles en una fecha
 */
export async function getAvailableDrivers(tenantId: string, date: Date) {
  const allDrivers = await prisma.user.findMany({
    where: {
      tenantId,
      role: 'REPARTIDOR',
      status: 'ACTIVE',
    },
    select: { id: true, nameEnc: true, email: true, phoneEnc: true },
  })

  const routesOfDay = await prisma.deliveryRoute.findMany({
    where: {
      tenantId,
      date: { gte: startOfDay(date), lte: endOfDay(date) },
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
    select: { deliveryUserId: true },
  })

  const assignedDriverIds = routesOfDay
    .map((r) => r.deliveryUserId)
    .filter((id): id is string => id !== null)

  return allDrivers.map((driver) => ({
    id: driver.id,
    name: driver.nameEnc,
    email: driver.email,
    phone: driver.phoneEnc,
    isAvailable: !assignedDriverIds.includes(driver.id),
  }))
}
