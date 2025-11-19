/**
 * Queries para Entregas y Confirmaciones
 * 
 * Confirmar entregas, reportar incidencias, tracking
 */

import { prisma } from '@/lib/db/prisma'
import type { ConfirmDeliveryInput, ReportIncidentInput } from '@/lib/validations/delivery'

/**
 * Confirmar entrega de un pedido
 */
export async function confirmDelivery(
  tenantId: string,
  data: ConfirmDeliveryInput
) {
  return await prisma.$transaction(async (tx) => {
    // Verificar que el pedido existe
    const order = await tx.order.findFirst({
      where: {
        id: data.orderId,
        tenantId,
      },
      include: {
        route: true,
      },
    })

    if (!order) {
      throw new Error('Pedido no encontrado')
    }

    if (order.status === 'DELIVERED') {
      throw new Error('El pedido ya fue entregado')
    }

    // Actualizar estado del pedido
    const updatedOrder = await tx.order.update({
      where: { id: data.orderId },
      data: {
        status: 'DELIVERED',
      },
    })

    // Crear delivery proof
    await tx.deliveryProof.create({
      data: {
        orderId: data.orderId,
        deliveredAt: data.deliveredAt,
        proofType: data.proofType,
        proofUrl: data.proofUrl,
        recipientName: data.recipientName,
        notes: data.notes,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    })

    // Crear evento de delivery si hay ruta
    if (order.routeId) {
      await tx.deliveryEvent.create({
        data: {
          routeId: order.routeId,
          type: 'ORDER_DELIVERED',
          timestamp: data.deliveredAt,
          metadata: {
            orderId: data.orderId,
            proofType: data.proofType,
            latitude: data.latitude,
            longitude: data.longitude,
          },
        },
      })
    }

    return updatedOrder
  })
}

/**
 * Reportar incidencia en entrega
 */
export async function reportDeliveryIncident(
  tenantId: string,
  data: ReportIncidentInput
) {
  return await prisma.$transaction(async (tx) => {
    // Verificar que el pedido existe
    const order = await tx.order.findFirst({
      where: {
        id: data.orderId,
        tenantId,
      },
      include: {
        route: true,
      },
    })

    if (!order) {
      throw new Error('Pedido no encontrado')
    }

    // Crear incidencia
    const incident = await tx.incident.create({
      data: {
        tenantId,
        orderId: data.orderId,
        type: data.type,
        description: data.description,
        reportedBy: 'DELIVERY', // TODO: Pasar userId del repartidor
        status: 'OPEN',
        metadata: {
          photoUrl: data.photoUrl,
          latitude: data.latitude,
          longitude: data.longitude,
          reportedAt: data.reportedAt || new Date(),
        },
      },
    })

    // Actualizar estado del pedido
    await tx.order.update({
      where: { id: data.orderId },
      data: {
        status: 'ISSUE_REPORTED',
      },
    })

    // Crear evento si hay ruta
    if (order.routeId) {
      await tx.deliveryEvent.create({
        data: {
          routeId: order.routeId,
          type: 'INCIDENT_REPORTED',
          timestamp: new Date(),
          metadata: {
            orderId: data.orderId,
            incidentId: incident.id,
            incidentType: data.type,
            latitude: data.latitude,
            longitude: data.longitude,
          },
        },
      })
    }

    return incident
  })
}

/**
 * Obtener tracking de una ruta
 * (Historial de eventos y ubicaciones)
 */
export async function getRouteTracking(tenantId: string, routeId: string) {
  const route = await prisma.deliveryRoute.findFirst({
    where: {
      id: routeId,
      tenantId,
    },
  })

  if (!route) {
    return null
  }

  const events = await prisma.deliveryEvent.findMany({
    where: { routeId },
    orderBy: { timestamp: 'asc' },
  })

  // Calcular estadísticas
  const delivered = events.filter((e) => e.type === 'ORDER_DELIVERED').length
  const incidents = events.filter((e) => e.type === 'INCIDENT_REPORTED').length

  // Extraer posiciones del metadata
  const positions = events
    .filter((e) => e.metadata && typeof e.metadata === 'object')
    .map((e) => {
      const meta = e.metadata as any
      if (meta.latitude && meta.longitude) {
        return {
          latitude: meta.latitude,
          longitude: meta.longitude,
          timestamp: e.timestamp,
          type: e.type,
        }
      }
      return null
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  return {
    route: {
      id: route.id,
      name: route.name,
      status: route.status,
      startedAt: route.startedAt,
      completedAt: route.completedAt,
    },
    events,
    stats: {
      delivered,
      incidents,
      totalEvents: events.length,
    },
    positions,
  }
}

/**
 * Actualizar ubicación en tiempo real
 */
export async function updateRouteLocation(
  tenantId: string,
  routeId: string,
  latitude: number,
  longitude: number
) {
  const route = await prisma.deliveryRoute.findFirst({
    where: {
      id: routeId,
      tenantId,
      status: 'IN_PROGRESS',
    },
  })

  if (!route) {
    throw new Error('Ruta no encontrada o no está en curso')
  }

  // Crear evento de ubicación
  const event = await prisma.deliveryEvent.create({
    data: {
      routeId,
      type: 'LOCATION_UPDATE',
      timestamp: new Date(),
      metadata: {
        latitude,
        longitude,
      },
    },
  })

  return event
}

/**
 * Obtener pedidos pendientes de una ruta para el repartidor
 */
export async function getRouteOrdersForDriver(tenantId: string, routeId: string) {
  const route = await prisma.deliveryRoute.findFirst({
    where: {
      id: routeId,
      tenantId,
    },
    include: {
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
              firstName: true,
              lastName: true,
              phone: true,
              allergies: true,
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
        ],
      },
    },
  })

  if (!route) {
    return null
  }

  // Agrupar pedidos por sede
  const ordersBySite = route.sites.map((routeSite) => {
    const siteOrders = route.orders.filter(
      (order) => order.companySiteId === routeSite.companySite.id
    )

    return {
      site: routeSite.companySite,
      sequence: routeSite.sequence,
      orders: siteOrders.map((order) => ({
        id: order.id,
        employeeName: `${order.employee.firstName} ${order.employee.lastName}`,
        employeePhone: order.employee.phone,
        employeeAllergies: order.employee.allergies as string[] | null,
        status: order.status,
        notes: order.notes,
        deliveryProof: order.deliveryProof,
      })),
      totalOrders: siteOrders.length,
      deliveredOrders: siteOrders.filter((o) => o.status === 'DELIVERED').length,
      pendingOrders: siteOrders.filter((o) => o.status === 'CONFIRMED').length,
    }
  })

  return {
    route: {
      id: route.id,
      name: route.name,
      date: route.date,
      status: route.status,
      startedAt: route.startedAt,
      estimatedDuration: route.estimatedDuration,
    },
    stops: ordersBySite,
    totalOrders: route.orders.length,
    totalSites: route.sites.length,
  }
}

/**
 * Obtener estadísticas de entregas de un repartidor
 */
export async function getDriverStats(tenantId: string, driverId: string) {
  const routes = await prisma.deliveryRoute.findMany({
    where: {
      tenantId,
      deliveryUserId: driverId,
    },
    include: {
      orders: {
        select: {
          status: true,
        },
      },
    },
  })

  const totalRoutes = routes.length
  const completedRoutes = routes.filter((r) => r.status === 'COMPLETED').length
  const inProgressRoutes = routes.filter((r) => r.status === 'IN_PROGRESS').length

  const allOrders = routes.flatMap((r) => r.orders)
  const totalDeliveries = allOrders.length
  const successfulDeliveries = allOrders.filter((o) => o.status === 'DELIVERED').length
  const incidents = allOrders.filter((o) => o.status === 'ISSUE_REPORTED').length

  return {
    totalRoutes,
    completedRoutes,
    inProgressRoutes,
    totalDeliveries,
    successfulDeliveries,
    incidents,
    successRate:
      totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0,
  }
}

