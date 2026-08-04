/**
 * Queries para Producción Diaria del Catering
 * 
 * Consolidación de pedidos, kitchen sheets, packing sheets
 */

import { prisma } from '@/lib/db/prisma'
import { startOfDay, endOfDay } from 'date-fns'

/**
 * Consolidar producción del día
 * Agrupa pedidos CONFIRMED y LOCKED_AFTER_CUTOFF por plato para saber cuánto
 * cocinar (tras el cutoff, el job lock-orders congela CONFIRMED → LOCKED; para
 * cocina ambos son pedidos definitivos).
 */
export async function consolidateProduction(tenantId: string, date: Date) {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  // Obtener todos los pedidos confirmados del día
  const orders = await prisma.order.findMany({
    where: {
      tenantCatering: tenantId,
      serviceDate: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: { in: ['CONFIRMED', 'LOCKED_AFTER_CUTOFF'] },
      deletedAt: null,
    },
    select: {
      id: true,
      employeeId: true,
      siteId: true,
      selection: true,
      price: true,
    },
  })

  // Consolidar por plato
  const dishCounts: Record<
    string,
    {
      dishId: string
      dishName: string
      course: string
      count: number
      orders: string[]
    }
  > = {}

  for (const order of orders) {
    if (!order.selection) continue

    const selection = order.selection as any

    // Procesar primer plato
    if (selection.first?.dishId) {
      const dishId = selection.first.dishId
      if (!dishCounts[dishId]) {
        dishCounts[dishId] = {
          dishId,
          dishName: selection.first.name || 'Plato desconocido',
          course: 'FIRST',
          count: 0,
          orders: [],
        }
      }
      dishCounts[dishId].count++
      dishCounts[dishId].orders.push(order.id)
    }

    // Procesar segundo plato
    if (selection.second?.dishId) {
      const dishId = selection.second.dishId
      if (!dishCounts[dishId]) {
        dishCounts[dishId] = {
          dishId,
          dishName: selection.second.name || 'Plato desconocido',
          course: 'SECOND',
          count: 0,
          orders: [],
        }
      }
      dishCounts[dishId].count++
      dishCounts[dishId].orders.push(order.id)
    }

    // Procesar postre
    if (selection.dessert?.dishId) {
      const dishId = selection.dessert.dishId
      if (!dishCounts[dishId]) {
        dishCounts[dishId] = {
          dishId,
          dishName: selection.dessert.name || 'Plato desconocido',
          course: 'DESSERT',
          count: 0,
          orders: [],
        }
      }
      dishCounts[dishId].count++
      dishCounts[dishId].orders.push(order.id)
    }
  }

  // Convertir a array y ordenar
  const consolidated = Object.values(dishCounts).sort((a, b) => {
    // Ordenar por tipo (FIRST, SECOND, DESSERT) y luego por nombre
    if (a.course !== b.course) {
      const order = { FIRST: 1, SECOND: 2, DESSERT: 3 }
      return order[a.course as keyof typeof order] - order[b.course as keyof typeof order]
    }
    return a.dishName.localeCompare(b.dishName)
  })

  return {
    date,
    totalOrders: orders.length,
    consolidated,
  }
}

/**
 * Obtener datos para Kitchen Display (por tipo de plato)
 */
export async function getKitchenDisplay(
  tenantId: string,
  date: Date,
  course: 'FIRST' | 'SECOND' | 'DESSERT'
) {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  // Obtener pedidos confirmados del día
  const orders = await prisma.order.findMany({
    where: {
      tenantCatering: tenantId,
      serviceDate: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: { in: ['CONFIRMED', 'LOCKED_AFTER_CUTOFF'] },
      deletedAt: null,
    },
    select: {
      id: true,
      selection: true,
    },
  })

  // Consolidar por plato del tipo especificado
  const dishCounts: Record<string, { name: string; count: number }> = {}

  for (const order of orders) {
    if (!order.selection) continue

    const selection = order.selection as any
    let dish: { dishId: string; name: string } | null = null

    switch (course) {
      case 'FIRST':
        dish = selection.first
        break
      case 'SECOND':
        dish = selection.second
        break
      case 'DESSERT':
        dish = selection.dessert
        break
    }

    if (dish?.dishId) {
      if (!dishCounts[dish.dishId]) {
        dishCounts[dish.dishId] = {
          name: dish.name || 'Plato desconocido',
          count: 0,
        }
      }
      dishCounts[dish.dishId]!.count++
    }
  }

  // Convertir a array y ordenar por cantidad (descendente)
  const items = Object.entries(dishCounts)
    .map(([dishId, { name, count }]) => ({
      dishId,
      dishName: name,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    date,
    course,
    totalItems: items.reduce((sum, item) => sum + item.count, 0),
    items,
  }
}

/**
 * Obtener datos para Packing Display
 * Pedidos agrupados por empresa/sede para empaquetado
 * 
 * NOTA: Simplificado - no incluye datos de empleado/sede por limitaciones del schema
 */
export async function getPackingDisplay(
  tenantId: string,
  date: Date,
  filters?: {
    companyId?: string
    siteId?: string
  }
) {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  const whereClause: any = {
    tenantCatering: tenantId,
    serviceDate: {
      gte: dayStart,
      lte: dayEnd,
    },
    status: { in: ['CONFIRMED', 'LOCKED_AFTER_CUTOFF'] },
    deletedAt: null,
  }

  if (filters?.siteId) {
    whereClause.siteId = filters.siteId
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    select: {
      id: true,
      employeeId: true,
      siteId: true,
      selection: true,
      tenantEmpresa: true,
    },
    orderBy: {
      siteId: 'asc',
    },
  })

  const formattedOrders = orders.map((order) => {
    const selection = order.selection as any
    
    return {
      id: order.id,
      employeeId: order.employeeId,
      siteId: order.siteId,
      dishes: {
        first: selection?.first || null,
        second: selection?.second || null,
        dessert: selection?.dessert || null,
      },
    }
  })

  return {
    date,
    totalOrders: formattedOrders.length,
    orders: formattedOrders,
  }
}

/**
 * Obtener pedidos para generar etiquetas
 * 
 * NOTA: Simplificado - retorna datos básicos del pedido
 */
export async function getOrdersForLabels(
  tenantId: string,
  date: Date,
  filters?: {
    companyId?: string
    siteId?: string
    orderIds?: string[]
  }
) {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  const whereClause: any = {
    tenantCatering: tenantId,
    serviceDate: {
      gte: dayStart,
      lte: dayEnd,
    },
    status: { in: ['CONFIRMED', 'LOCKED_AFTER_CUTOFF'] },
    deletedAt: null,
  }

  if (filters?.orderIds && filters.orderIds.length > 0) {
    whereClause.id = { in: filters.orderIds }
  }

  if (filters?.siteId) {
    whereClause.siteId = filters.siteId
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    select: {
      id: true,
      employeeId: true,
      siteId: true,
      selection: true,
    },
  })

  // Generar etiquetas (una por plato)
  const labels: any[] = []

  orders.forEach((order) => {
    const selection = order.selection as any

    // Etiqueta para primer plato
    if (selection?.first) {
      labels.push({
        orderId: order.id,
        course: 'FIRST',
        dishName: selection.first.name,
        employeeId: order.employeeId,
        siteId: order.siteId,
      })
    }

    // Etiqueta para segundo plato
    if (selection?.second) {
      labels.push({
        orderId: order.id,
        course: 'SECOND',
        dishName: selection.second.name,
        employeeId: order.employeeId,
        siteId: order.siteId,
      })
    }

    // Etiqueta para postre
    if (selection?.dessert) {
      labels.push({
        orderId: order.id,
        course: 'DESSERT',
        dishName: selection.dessert.name,
        employeeId: order.employeeId,
        siteId: order.siteId,
      })
    }
  })

  return labels
}

/**
 * Obtener estadísticas de producción del día
 */
export async function getProductionStats(tenantId: string, date: Date) {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  const [totalOrders, confirmedOrders, deliveredOrders] = await Promise.all([
    prisma.order.count({
      where: {
        tenantCatering: tenantId,
        serviceDate: {
          gte: dayStart,
          lte: dayEnd,
        },
        deletedAt: null,
      },
    }),
    prisma.order.count({
      where: {
        tenantCatering: tenantId,
        serviceDate: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: { in: ['CONFIRMED', 'LOCKED_AFTER_CUTOFF'] },
        deletedAt: null,
      },
    }),
    prisma.order.count({
      where: {
        tenantCatering: tenantId,
        serviceDate: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: 'DELIVERED',
        deletedAt: null,
      },
    }),
  ])

  return {
    totalOrders,
    confirmedOrders,
    deliveredOrders,
    pendingOrders: confirmedOrders - deliveredOrders,
  }
}
