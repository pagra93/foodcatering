/**
 * Queries para Entregas y Confirmaciones del Catering
 *
 * Confirmar entregas, reportar incidencias, tracking de rutas.
 * El `tenantId` de estas funciones es siempre el tenant del CATERING.
 */

import { prisma } from '@/lib/db/prisma'
import type { ConfirmDeliveryInput, ReportIncidentInput } from '@/lib/validations/delivery'
import { createHash } from 'crypto'
import {
  computeOrderIntegrityHash,
  recordOrderHistory,
} from '@/lib/db/queries/order-history'

function computeProofHash(orderId: string, deliveredAt: Date, proofType: string): string {
  return createHash('sha256')
    .update(`${orderId}|${deliveredAt.toISOString()}|${proofType}`)
    .digest('hex')
}

/**
 * Confirmar entrega de un pedido
 */
export async function confirmDelivery(tenantId: string, data: ConfirmDeliveryInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: data.orderId,
        tenantCatering: tenantId,
      },
    })

    if (!order) {
      throw new Error('Pedido no encontrado')
    }

    if (order.status === 'DELIVERED') {
      throw new Error('El pedido ya fue entregado')
    }

    const newVersion = order.version + 1
    const integrityHash = computeOrderIntegrityHash({
      tenantEmpresa: order.tenantEmpresa,
      tenantCatering: order.tenantCatering,
      employeeId: order.employeeId,
      siteId: order.siteId,
      serviceDate: order.serviceDate,
      selection: order.selection,
      price: order.price,
      menuType: order.menuType,
      status: 'DELIVERED',
      version: newVersion,
    })

    const updatedOrder = await tx.order.update({
      where: { id: data.orderId },
      data: {
        status: 'DELIVERED',
        statusChangedAt: new Date(),
        version: newVersion,
        integrityHash,
      },
    })

    await recordOrderHistory(
      tx,
      {
        orderId: order.id,
        version: newVersion,
        changedBy: 'DELIVERY',
        changeReason: 'DELIVERY_MARK',
        prevValues: { status: order.status },
        newValues: { status: 'DELIVERED' },
      },
      integrityHash
    )

    await tx.deliveryProof.create({
      data: {
        orderId: data.orderId,
        deliveredAt: data.deliveredAt,
        proofType: data.proofType,
        proofUrl: data.proofUrl ?? null,
        recipientName: data.recipientName ?? null,
        notes: data.notes ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        verificationHash: computeProofHash(data.orderId, data.deliveredAt, data.proofType),
      },
    })

    if (order.routeId) {
      await tx.deliveryRouteEvent.create({
        data: {
          routeId: order.routeId,
          type: 'ORDER_DELIVERED',
          timestamp: data.deliveredAt,
          metadata: {
            orderId: data.orderId,
            proofType: data.proofType,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
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
  data: ReportIncidentInput,
  reportedByUserId?: string
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: data.orderId,
        tenantCatering: tenantId,
      },
    })

    if (!order) {
      throw new Error('Pedido no encontrado')
    }

    const incident = await tx.incident.create({
      data: {
        tenantEmpresa: order.tenantEmpresa,
        tenantCatering: tenantId,
        orderId: data.orderId,
        type: data.type,
        description: data.description,
        status: 'OPEN',
        openedBy: reportedByUserId ?? 'DELIVERY',
        reportedBy: reportedByUserId ?? null,
        metadata: {
          photoUrl: data.photoUrl ?? null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          reportedAt: (data.reportedAt ?? new Date()).toISOString(),
        },
      },
    })

    const newVersion = order.version + 1
    const integrityHash = computeOrderIntegrityHash({
      tenantEmpresa: order.tenantEmpresa,
      tenantCatering: order.tenantCatering,
      employeeId: order.employeeId,
      siteId: order.siteId,
      serviceDate: order.serviceDate,
      selection: order.selection,
      price: order.price,
      menuType: order.menuType,
      status: 'ISSUE_REPORTED',
      version: newVersion,
    })

    await tx.order.update({
      where: { id: data.orderId },
      data: {
        status: 'ISSUE_REPORTED',
        statusChangedAt: new Date(),
        version: newVersion,
        integrityHash,
      },
    })

    await recordOrderHistory(
      tx,
      {
        orderId: order.id,
        version: newVersion,
        changedBy: reportedByUserId ?? 'DELIVERY',
        changeReason: 'SYSTEM_ADJUSTMENT',
        prevValues: { status: order.status },
        newValues: { status: 'ISSUE_REPORTED' },
      },
      integrityHash
    )

    if (order.routeId) {
      await tx.deliveryRouteEvent.create({
        data: {
          routeId: order.routeId,
          type: 'INCIDENT_REPORTED',
          timestamp: new Date(),
          metadata: {
            orderId: data.orderId,
            incidentId: incident.id,
            incidentType: data.type,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
          },
        },
      })
    }

    return incident
  })
}

/**
 * Obtener tracking de una ruta (historial de eventos y posiciones)
 */
export async function getRouteTracking(tenantId: string, routeId: string) {
  const route = await prisma.deliveryRoute.findFirst({
    where: { id: routeId, tenantId },
  })

  if (!route) {
    return null
  }

  const events = await prisma.deliveryRouteEvent.findMany({
    where: { routeId },
    orderBy: { timestamp: 'asc' },
  })

  const delivered = events.filter((e) => e.type === 'ORDER_DELIVERED').length
  const incidents = events.filter((e) => e.type === 'INCIDENT_REPORTED').length

  const positions = events
    .map((e) => {
      if (!e.metadata || typeof e.metadata !== 'object') return null
      const meta = e.metadata as Record<string, unknown>
      const lat = meta['latitude']
      const lng = meta['longitude']
      if (typeof lat !== 'number' || typeof lng !== 'number') return null
      return { latitude: lat, longitude: lng, timestamp: e.timestamp, type: e.type }
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
    stats: { delivered, incidents, totalEvents: events.length },
    positions,
  }
}

/**
 * Actualizar ubicación en tiempo real de una ruta en curso
 */
export async function updateRouteLocation(
  tenantId: string,
  routeId: string,
  latitude: number,
  longitude: number
) {
  const route = await prisma.deliveryRoute.findFirst({
    where: { id: routeId, tenantId, status: 'IN_PROGRESS' },
  })

  if (!route) {
    throw new Error('Ruta no encontrada o no está en curso')
  }

  return prisma.deliveryRouteEvent.create({
    data: {
      routeId,
      type: 'LOCATION_UPDATE',
      timestamp: new Date(),
      metadata: { latitude, longitude },
    },
  })
}

/**
 * Obtener pedidos pendientes de una ruta para el repartidor
 */
export async function getRouteOrdersForDriver(tenantId: string, routeId: string) {
  const route = await prisma.deliveryRoute.findFirst({
    where: { id: routeId, tenantId },
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
                select: { id: true, legalName: true },
              },
            },
          },
        },
        orderBy: { sequence: 'asc' },
      },
      orders: {
        where: { deletedAt: null },
        include: { deliveryProof: true },
      },
    },
  })

  if (!route) {
    return null
  }

  // Order no tiene relación directa con Employee: lo resolvemos por batch
  const employeeIds = Array.from(new Set(route.orders.map((o) => o.employeeId)))
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    include: {
      user: { select: { nameEnc: true, phoneEnc: true } },
    },
  })
  const employeeMap = new Map(employees.map((e) => [e.id, e]))

  const ordersBySite = route.sites.map((routeSite) => {
    const siteOrders = route.orders.filter((o) => o.siteId === routeSite.companySite.id)

    return {
      site: routeSite.companySite,
      sequence: routeSite.sequence,
      orders: siteOrders.map((order) => {
        const employee = employeeMap.get(order.employeeId)
        return {
          id: order.id,
          employeeName: employee?.user.nameEnc ?? 'Desconocido',
          employeePhone: employee?.user.phoneEnc ?? null,
          status: order.status,
          notes: order.notes ?? null,
          deliveryProof: order.deliveryProof,
        }
      }),
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
 * Estadísticas de entregas de un repartidor
 */
export async function getDriverStats(tenantId: string, driverId: string) {
  const routes = await prisma.deliveryRoute.findMany({
    where: { tenantId, deliveryUserId: driverId },
    include: {
      orders: { select: { status: true } },
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
    successRate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0,
  }
}
