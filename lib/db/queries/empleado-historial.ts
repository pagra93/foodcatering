/**
 * Queries para Historial de Pedidos del Empleado
 * Vista completa de pedidos anteriores
 */

import { prisma } from '@/lib/db/prisma'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

// ============================================================================
// OBTENER HISTORIAL DE PEDIDOS CON FILTROS
// ============================================================================

type GetOrderHistoryFilters = {
  employeeId: string
  month?: Date // Si se pasa, filtra por mes específico
  status?: string
  search?: string
  page?: number
  limit?: number
}

export async function getOrderHistory({
  employeeId,
  month,
  status,
  search,
  page = 1,
  limit = 20,
}: GetOrderHistoryFilters) {
  const skip = (page - 1) * limit

  // Construir filtros
  const where: any = {
    employeeId,
  }

  // Filtro por mes
  if (month) {
    const startMonth = startOfMonth(month)
    const endMonth = endOfMonth(month)
    where.serviceDate = {
      gte: startMonth,
      lte: endMonth,
    }
  }

  // Filtro por estado
  if (status && status !== 'ALL') {
    where.status = status
  }

  // Búsqueda por ID o menú
  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { menuType: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Obtener pedidos
  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        serviceDate: true,
        menuType: true,
        status: true,
        price: true,
        selection: true,
        createdAt: true,
        dishRatings: { select: { rating: true } },
      },
      orderBy: {
        serviceDate: 'desc',
      },
      skip,
      take: limit,
    }),

    prisma.order.count({ where }),
  ])

  return {
    orders: orders.map((order) => {
      const { dishRatings, ...rest } = order
      const ratedCount = dishRatings.length
      const avgRating =
        ratedCount > 0
          ? Math.round(
              (dishRatings.reduce((s, r) => s + r.rating, 0) / ratedCount) * 10
            ) / 10
          : null
      return {
        ...rest,
        price: Number(order.price),
        ratedCount,
        avgRating,
      }
    }),
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

// ============================================================================
// OBTENER KPIs DEL HISTORIAL
// ============================================================================

export async function getOrderHistoryKPIs(employeeId: string) {
  const now = new Date()
  const last3Months = subMonths(now, 3)
  const last6Months = subMonths(now, 6)

  const [
    totalOrders,
    ordersLast3Months,
    ordersLast6Months,
    totalSpent,
    spentLast3Months,
    deliveredOrders,
    cancelledOrders,
  ] = await Promise.all([
    // Total pedidos
    prisma.order.count({
      where: { employeeId },
    }),

    // Pedidos últimos 3 meses
    prisma.order.count({
      where: {
        employeeId,
        serviceDate: { gte: last3Months },
      },
    }),

    // Pedidos últimos 6 meses
    prisma.order.count({
      where: {
        employeeId,
        serviceDate: { gte: last6Months },
      },
    }),

    // Gasto total
    prisma.order.aggregate({
      where: { employeeId },
      _sum: { price: true },
    }),

    // Gasto últimos 3 meses
    prisma.order.aggregate({
      where: {
        employeeId,
        serviceDate: { gte: last3Months },
      },
      _sum: { price: true },
    }),

    // Pedidos entregados
    prisma.order.count({
      where: {
        employeeId,
        status: 'DELIVERED',
      },
    }),

    // Pedidos cancelados
    prisma.order.count({
      where: {
        employeeId,
        status: 'CANCELLED_BEFORE_CUTOFF',
      },
    }),

  ])

  return {
    totalOrders,
    ordersLast3Months,
    ordersLast6Months,
    totalSpent: totalSpent._sum.price ? Number(totalSpent._sum.price) : 0,
    spentLast3Months: spentLast3Months._sum.price
      ? Number(spentLast3Months._sum.price)
      : 0,
    deliveredOrders,
    cancelledOrders,
    cancelledRate:
      totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
  }
}

// ============================================================================
// OBTENER MESES DISPONIBLES (para filtro)
// ============================================================================

export async function getAvailableMonths(employeeId: string) {
  const orders = await prisma.order.findMany({
    where: { employeeId },
    select: {
      serviceDate: true,
    },
    orderBy: {
      serviceDate: 'desc',
    },
  })

  // Extraer meses únicos
  const monthsSet = new Set<string>()
  orders.forEach((order) => {
    const month = startOfMonth(order.serviceDate)
    monthsSet.add(month.toISOString())
  })

  return Array.from(monthsSet)
    .map((monthStr) => new Date(monthStr))
    .sort((a, b) => b.getTime() - a.getTime())
}

