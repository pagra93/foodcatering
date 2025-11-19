/**
 * Queries para Producción Diaria del Catering
 * 
 * Consolidación de pedidos, kitchen sheets, packing sheets
 */

import { prisma } from '@/lib/db/prisma'
import { startOfDay, endOfDay } from 'date-fns'

/**
 * Consolidar producción del día
 * Agrupa pedidos CONFIRMED por plato para saber cuánto cocinar
 */
export async function consolidateProduction(tenantId: string, date: Date) {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  // Obtener todos los pedidos confirmados del día
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      serviceDate: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: 'CONFIRMED',
      deletedAt: null,
    },
    include: {
      dishSelection: true,
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      companySite: {
        select: {
          id: true,
          name: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
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
    if (!order.dishSelection) continue

    const selection = order.dishSelection as any

    // Procesar primer plato
    if (selection.firstId) {
      if (!dishCounts[selection.firstId]) {
        dishCounts[selection.firstId] = {
          dishId: selection.firstId,
          dishName: selection.firstId, // Temporal, lo resolveremos después
          course: 'FIRST',
          count: 0,
          orders: [],
        }
      }
      dishCounts[selection.firstId].count++
      dishCounts[selection.firstId].orders.push(order.id)
    }

    // Procesar segundo plato
    if (selection.secondId) {
      if (!dishCounts[selection.secondId]) {
        dishCounts[selection.secondId] = {
          dishId: selection.secondId,
          dishName: selection.secondId,
          course: 'SECOND',
          count: 0,
          orders: [],
        }
      }
      dishCounts[selection.secondId].count++
      dishCounts[selection.secondId].orders.push(order.id)
    }

    // Procesar postre
    if (selection.dessertId) {
      if (!dishCounts[selection.dessertId]) {
        dishCounts[selection.dessertId] = {
          dishId: selection.dessertId,
          dishName: selection.dessertId,
          course: 'DESSERT',
          count: 0,
          orders: [],
        }
      }
      dishCounts[selection.dessertId].count++
      dishCounts[selection.dessertId].orders.push(order.id)
    }
  }

  // Obtener nombres de platos
  const dishIds = Object.keys(dishCounts)
  const dishes = await prisma.dish.findMany({
    where: {
      id: { in: dishIds },
    },
    select: {
      id: true,
      name: true,
      course: true,
    },
  })

  // Mapear nombres
  dishes.forEach((dish) => {
    if (dishCounts[dish.id]) {
      dishCounts[dish.id].dishName = dish.name
    }
  })

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
      tenantId,
      serviceDate: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: 'CONFIRMED',
      deletedAt: null,
    },
    include: {
      dishSelection: true,
    },
  })

  // Consolidar por plato del tipo especificado
  const dishCounts: Record<string, number> = {}
  const dishNames: Record<string, string> = {}

  for (const order of orders) {
    if (!order.dishSelection) continue

    const selection = order.dishSelection as any
    let dishId: string | null = null

    switch (course) {
      case 'FIRST':
        dishId = selection.firstId
        break
      case 'SECOND':
        dishId = selection.secondId
        break
      case 'DESSERT':
        dishId = selection.dessertId
        break
    }

    if (dishId) {
      dishCounts[dishId] = (dishCounts[dishId] || 0) + 1
    }
  }

  // Obtener nombres de platos
  const dishIds = Object.keys(dishCounts)
  const dishes = await prisma.dish.findMany({
    where: {
      id: { in: dishIds },
    },
    select: {
      id: true,
      name: true,
      course: true,
    },
  })

  dishes.forEach((dish) => {
    dishNames[dish.id] = dish.name
  })

  // Convertir a array y ordenar por cantidad (descendente)
  const items = Object.entries(dishCounts)
    .map(([dishId, count]) => ({
      dishId,
      dishName: dishNames[dishId] || 'Plato desconocido',
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
    tenantId,
    serviceDate: {
      gte: dayStart,
      lte: dayEnd,
    },
    status: 'CONFIRMED',
    deletedAt: null,
  }

  if (filters?.companyId) {
    whereClause.companySite = {
      companyId: filters.companyId,
    }
  }

  if (filters?.siteId) {
    whereClause.companySiteId = filters.siteId
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          allergies: true,
        },
      },
      companySite: {
        select: {
          id: true,
          name: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      dishSelection: true,
    },
    orderBy: [
      {
        companySite: {
          company: {
            name: 'asc',
          },
        },
      },
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
  })

  // Obtener nombres de platos
  const dishIds: string[] = []
  orders.forEach((order) => {
    if (order.dishSelection) {
      const selection = order.dishSelection as any
      if (selection.firstId) dishIds.push(selection.firstId)
      if (selection.secondId) dishIds.push(selection.secondId)
      if (selection.dessertId) dishIds.push(selection.dessertId)
    }
  })

  const dishes = await prisma.dish.findMany({
    where: {
      id: { in: [...new Set(dishIds)] },
    },
    select: {
      id: true,
      name: true,
      course: true,
    },
  })

  const dishMap = new Map(dishes.map((d) => [d.id, d]))

  // Formatear datos para display
  const formattedOrders = orders.map((order) => {
    const selection = order.dishSelection as any
    const first = selection?.firstId ? dishMap.get(selection.firstId) : null
    const second = selection?.secondId ? dishMap.get(selection.secondId) : null
    const dessert = selection?.dessertId ? dishMap.get(selection.dessertId) : null

    return {
      id: order.id,
      employeeName: `${order.employee.firstName} ${order.employee.lastName}`,
      employeeAllergies: order.employee.allergies as string[] | null,
      company: order.companySite.company.name,
      site: order.companySite.name,
      dishes: {
        first: first ? { id: first.id, name: first.name, course: first.course } : null,
        second: second ? { id: second.id, name: second.name, course: second.course } : null,
        dessert: dessert ? { id: dessert.id, name: dessert.name, course: dessert.course } : null,
      },
      notes: order.notes,
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
    tenantId,
    serviceDate: {
      gte: dayStart,
      lte: dayEnd,
    },
    status: 'CONFIRMED',
    deletedAt: null,
  }

  if (filters?.orderIds && filters.orderIds.length > 0) {
    whereClause.id = { in: filters.orderIds }
  }

  if (filters?.companyId) {
    whereClause.companySite = {
      companyId: filters.companyId,
    }
  }

  if (filters?.siteId) {
    whereClause.companySiteId = filters.siteId
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      companySite: {
        select: {
          name: true,
          company: {
            select: {
              name: true,
              logoUrl: true,
            },
          },
        },
      },
      dishSelection: true,
    },
  })

  // Obtener platos
  const dishIds: string[] = []
  orders.forEach((order) => {
    if (order.dishSelection) {
      const selection = order.dishSelection as any
      if (selection.firstId) dishIds.push(selection.firstId)
      if (selection.secondId) dishIds.push(selection.secondId)
      if (selection.dessertId) dishIds.push(selection.dessertId)
    }
  })

  const dishes = await prisma.dish.findMany({
    where: {
      id: { in: [...new Set(dishIds)] },
    },
    select: {
      id: true,
      name: true,
      course: true,
    },
  })

  const dishMap = new Map(dishes.map((d) => [d.id, d]))

  // Generar etiquetas (una por plato)
  const labels: any[] = []

  orders.forEach((order) => {
    const selection = order.dishSelection as any
    const employeeName = `${order.employee.firstName} ${order.employee.lastName}`
    const company = order.companySite.company.name
    const site = order.companySite.name
    const logoUrl = order.companySite.company.logoUrl

    // Etiqueta para primer plato
    if (selection?.firstId) {
      const dish = dishMap.get(selection.firstId)
      if (dish) {
        labels.push({
          orderId: order.id,
          course: dish.course,
          dishName: dish.name,
          employeeName,
          company,
          site,
          logoUrl,
        })
      }
    }

    // Etiqueta para segundo plato
    if (selection?.secondId) {
      const dish = dishMap.get(selection.secondId)
      if (dish) {
        labels.push({
          orderId: order.id,
          course: dish.course,
          dishName: dish.name,
          employeeName,
          company,
          site,
          logoUrl,
        })
      }
    }

    // Etiqueta para postre
    if (selection?.dessertId) {
      const dish = dishMap.get(selection.dessertId)
      if (dish) {
        labels.push({
          orderId: order.id,
          course: dish.course,
          dishName: dish.name,
          employeeName,
          company,
          site,
          logoUrl,
        })
      }
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

  const [totalOrders, confirmedOrders, deliveredOrders, companies] = await Promise.all([
    prisma.order.count({
      where: {
        tenantId,
        serviceDate: {
          gte: dayStart,
          lte: dayEnd,
        },
        deletedAt: null,
      },
    }),
    prisma.order.count({
      where: {
        tenantId,
        serviceDate: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: 'CONFIRMED',
        deletedAt: null,
      },
    }),
    prisma.order.count({
      where: {
        tenantId,
        serviceDate: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: 'DELIVERED',
        deletedAt: null,
      },
    }),
    prisma.order
      .findMany({
        where: {
          tenantId,
          serviceDate: {
            gte: dayStart,
            lte: dayEnd,
          },
          status: 'CONFIRMED',
          deletedAt: null,
        },
        select: {
          companySite: {
            select: {
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })
      .then((orders) => {
        const uniqueCompanies = new Map()
        orders.forEach((order) => {
          uniqueCompanies.set(
            order.companySite.company.id,
            order.companySite.company.name
          )
        })
        return Array.from(uniqueCompanies.entries()).map(([id, name]) => ({
          id,
          name,
        }))
      }),
  ])

  return {
    totalOrders,
    confirmedOrders,
    deliveredOrders,
    pendingOrders: confirmedOrders - deliveredOrders,
    companies: companies.length,
    companiesList: companies,
  }
}

