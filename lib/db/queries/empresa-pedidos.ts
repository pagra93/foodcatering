/**
 * Queries para gestión de Pedidos en Portal Empresa
 * Histórico, filtros, detalle, export
 */

import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from 'date-fns'
import { csvCell } from '@/lib/utils/csv'

// ============================================================================
// LISTADO DE PEDIDOS CON FILTROS
// ============================================================================

export type OrderFilters = {
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  employeeId?: string
  siteId?: string
  period?: 'today' | 'week' | 'month' | 'custom'
  page?: number
  pageSize?: number
}

function buildOrdersWhere(
  tenantId: string,
  filters: OrderFilters = {}
): Prisma.OrderWhereInput {
  const { status, dateFrom, dateTo, employeeId, siteId, period = 'month' } = filters

  const today = new Date()
  let startDate: Date
  let endDate: Date = new Date()

  // Determinar rango de fechas según período
  switch (period) {
    case 'today':
      startDate = today
      endDate = today
      break
    case 'week':
      startDate = startOfWeek(today, { weekStartsOn: 1 })
      endDate = endOfWeek(today, { weekStartsOn: 1 })
      break
    case 'month':
      startDate = startOfMonth(today)
      endDate = endOfMonth(today)
      break
    case 'custom':
      startDate = dateFrom ? new Date(dateFrom) : subDays(today, 30)
      endDate = dateTo ? new Date(dateTo) : today
      break
    default:
      startDate = startOfMonth(today)
      endDate = endOfMonth(today)
  }

  const where: Prisma.OrderWhereInput = {
    tenantEmpresa: tenantId,
    serviceDate: {
      gte: startDate,
      lte: endDate,
    },
    deletedAt: null,
  }

  if (status && status !== 'all') {
    where.status = status as Prisma.OrderWhereInput['status']
  }
  if (employeeId && employeeId !== 'all') {
    where.employeeId = employeeId
  }
  if (siteId && siteId !== 'all') {
    where.siteId = siteId
  }

  return where
}

export async function getOrders(tenantId: string, filters: OrderFilters = {}) {
  const { page = 1, pageSize = 20 } = filters
  const where = buildOrdersWhere(tenantId, filters)

  const [orders, total, stats] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        serviceDate: true,
        siteId: true,
        status: true,
        price: true,
        menuType: true,
        selection: true,
        createdAt: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { serviceDate: 'desc' },
    }),
    prisma.order.count({ where }),
    // Estadísticas del período
    prisma.order.aggregate({
      where,
      _sum: { price: true },
      _count: true,
    }),
  ])

  // Obtener info de empleados para los pedidos
  const employeeIds = [...new Set(orders.map((o) => o.employeeId))]
  const employees = await prisma.employee.findMany({
    where: {
      id: { in: employeeIds },
    },
    select: {
      id: true,
      employeeNumber: true,
      department: true,
      user: {
        select: {
          nameEnc: true,
          email: true,
        },
      },
      site: {
        select: {
          name: true,
        },
      },
    },
  })

  const employeeMap = new Map(employees.map((e) => [e.id, e]))

  // Enriquecer pedidos con info de empleados
  const enrichedOrders = orders.map((order) => {
    const employee = employeeMap.get(order.employeeId)
    return {
      id: order.id,
      serviceDate: order.serviceDate,
      status: order.status,
      price: Number(order.price),
      menuType: order.menuType,
      selection: order.selection,
      createdAt: order.createdAt,
      employee: employee
        ? {
            id: employee.id,
            name: employee.user.nameEnc,
            email: employee.user.email,
            employeeNumber: employee.employeeNumber,
            department: employee.department,
            site: employee.site.name,
          }
        : null,
    }
  })

  return {
    orders: enrichedOrders,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    stats: {
      totalOrders: stats._count,
      totalAmount: Number(stats._sum.price || 0),
      avgTicket:
        stats._count > 0 ? Number(stats._sum.price || 0) / stats._count : 0,
    },
  }
}

// ============================================================================
// DETALLE DE PEDIDO
// ============================================================================

export async function getOrderById(orderId: string, tenantId: string) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantEmpresa: tenantId,
      deletedAt: null,
    },
    include: {
      deliveryProof: true,
      rating: true,
      incidents: {
        select: {
          id: true,
          type: true,
          severity: true,
          status: true,
          resolution: true,
          createdAt: true,
        },
      },
      history: {
        select: {
          id: true,
          version: true,
          changedAt: true,
          changedBy: true,
          changeReason: true,
          prevValues: true,
          newValues: true,
        },
        orderBy: { changedAt: 'desc' },
      },
    },
  })

  if (!order) {
    return null
  }

  // Obtener info del empleado
  const employee = await prisma.employee.findUnique({
    where: { id: order.employeeId },
    select: {
      id: true,
      employeeNumber: true,
      department: true,
      position: true,
      user: {
        select: {
          nameEnc: true,
          email: true,
          phoneEnc: true,
        },
      },
      site: {
        select: {
          id: true,
          name: true,
          address: true,
          deliveryWindow: true,
        },
      },
    },
  })

  return {
    id: order.id,
    serviceDate: order.serviceDate,
    status: order.status,
    price: Number(order.price),
    menuType: order.menuType,
    selection: order.selection,
    statusChangedAt: order.statusChangedAt,
    lockedAt: order.lockedAt,
    integrityHash: order.integrityHash,
    version: order.version,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    employee: employee
      ? {
          id: employee.id,
          name: employee.user.nameEnc,
          email: employee.user.email,
          phone: employee.user.phoneEnc,
          employeeNumber: employee.employeeNumber,
          department: employee.department,
          position: employee.position,
          site: employee.site,
        }
      : null,
    deliveryProof: order.deliveryProof
      ? {
          id: order.deliveryProof.id,
          deliveredAt: order.deliveryProof.deliveredAt,
          deliveredBy: order.deliveryProof.deliveredBy,
          deliveryMethod: order.deliveryProof.deliveryMethod,
          signatureImageUrl: order.deliveryProof.signatureImageUrl,
          geoLocation: order.deliveryProof.geoLocation,
          notes: order.deliveryProof.notes,
          verificationHash: order.deliveryProof.verificationHash,
        }
      : null,
    rating: order.rating
      ? {
          id: order.rating.id,
          rating: order.rating.rating,
          tasteRating: order.rating.tasteRating,
          portionRating: order.rating.portionRating,
          presentationRating: order.rating.presentationRating,
          comment: order.rating.comment,
          createdAt: order.rating.createdAt,
        }
      : null,
    incidents: order.incidents,
    history: order.history,
  }
}

// ============================================================================
// EXPORT CSV
// ============================================================================

/**
 * Export CSV de pedidos en STREAMING con paginación por cursor: sin tope
 * silencioso de filas (antes se cortaba en 10.000 sin avisar) y sin construir
 * el fichero entero en memoria. Los totales van en cabeceras X-Total-*.
 */
export async function exportOrdersCSVStream(
  tenantId: string,
  filters: OrderFilters = {}
) {
  const where = buildOrdersWhere(tenantId, filters)

  const stats = await prisma.order.aggregate({
    where,
    _sum: { price: true },
    _count: true,
  })

  const headers = [
    'ID',
    'Fecha Servicio',
    'Empleado',
    'Email',
    'Número Empleado',
    'Departamento',
    'Sede',
    'Estado',
    'Tipo Menú',
    'Importe (€)',
    'Fecha Creación',
  ]

  const BATCH_SIZE = 1000

  async function* csvChunks(): AsyncGenerator<string> {
    // BOM UTF-8 + cabecera (celdas escapadas + anti inyección de fórmulas).
    yield '﻿' + headers.map((h) => csvCell(h)).join(',') + '\n'

    let cursor: string | null = null
    for (;;) {
      // Anotación explícita: el uso de `cursor` dentro del initializer crearía
      // una inferencia circular batch → cursor → batch (TS7022).
      const batch: Prisma.OrderGetPayload<{
        select: {
          id: true
          employeeId: true
          serviceDate: true
          status: true
          price: true
          menuType: true
          createdAt: true
        }
      }>[] = await prisma.order.findMany({
        where,
        select: {
          id: true,
          employeeId: true,
          serviceDate: true,
          status: true,
          price: true,
          menuType: true,
          createdAt: true,
        },
        orderBy: [{ serviceDate: 'desc' }, { id: 'asc' }],
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      })
      if (batch.length === 0) return

      const employeeIds: string[] = [...new Set(batch.map((o) => o.employeeId))]
      const employees = await prisma.employee.findMany({
        where: { id: { in: employeeIds } },
        select: {
          id: true,
          employeeNumber: true,
          department: true,
          user: { select: { nameEnc: true, email: true } },
          site: { select: { name: true } },
        },
      })
      const employeeMap = new Map(employees.map((e) => [e.id, e]))

      let chunk = ''
      for (const order of batch) {
        const employee = employeeMap.get(order.employeeId)
        const row = [
          order.id,
          order.serviceDate.toISOString().split('T')[0],
          employee?.user.nameEnc || 'N/A',
          employee?.user.email || 'N/A',
          employee?.employeeNumber || 'N/A',
          employee?.department || 'N/A',
          employee?.site.name || 'N/A',
          order.status,
          order.menuType,
          Number(order.price).toFixed(2),
          order.createdAt.toISOString(),
        ]
        chunk += row.map((cell) => csvCell(cell)).join(',') + '\n'
      }
      yield chunk

      cursor = batch[batch.length - 1]?.id ?? null
      if (batch.length < BATCH_SIZE || !cursor) return
    }
  }

  const encoder = new TextEncoder()
  const iterator = csvChunks()
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await iterator.next()
      if (done) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(value))
    },
    cancel() {
      void iterator.return(undefined)
    },
  })

  return {
    stream,
    filename: `pedidos_${filters.period || 'export'}_${new Date().toISOString().split('T')[0]}.csv`,
    stats: {
      totalOrders: stats._count,
      totalAmount: Number(stats._sum.price || 0),
    },
  }
}

// ============================================================================
// RESUMEN MENSUAL
// ============================================================================

export async function getMonthlyOrdersSummary(
  tenantId: string,
  year: number,
  month: number
) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)

  const [totalOrders, ordersByStatus, ordersByEmployee, dailyOrders] =
    await Promise.all([
      // Total y suma
      prisma.order.aggregate({
        where: {
          tenantEmpresa: tenantId,
          serviceDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        _sum: { price: true },
        _count: true,
      }),

      // Por estado
      prisma.order.groupBy({
        by: ['status'],
        where: {
          tenantEmpresa: tenantId,
          serviceDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        _count: true,
        _sum: { price: true },
      }),

      // Por empleado (top 10)
      prisma.order.groupBy({
        by: ['employeeId'],
        where: {
          tenantEmpresa: tenantId,
          serviceDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        _count: true,
        _sum: { price: true },
        orderBy: { _count: { employeeId: 'desc' } },
        take: 10,
      }),

      // Por día
      prisma.$queryRaw<Array<{ date: Date; count: bigint; total: number }>>`
        SELECT 
          DATE(service_date) as date,
          COUNT(*)::bigint as count,
          SUM(price)::numeric as total
        FROM orders
        WHERE tenant_empresa = ${tenantId}
          AND service_date >= ${startDate}
          AND service_date <= ${endDate}
          AND deleted_at IS NULL
        GROUP BY DATE(service_date)
        ORDER BY DATE(service_date) ASC
      `,
    ])

  return {
    period: { year, month, startDate, endDate },
    summary: {
      totalOrders: totalOrders._count,
      totalAmount: Number(totalOrders._sum.price || 0),
      avgTicket:
        totalOrders._count > 0
          ? Number(totalOrders._sum.price || 0) / totalOrders._count
          : 0,
    },
    byStatus: ordersByStatus.map((item) => ({
      status: item.status,
      count: item._count,
      amount: Number(item._sum.price || 0),
    })),
    topEmployees: ordersByEmployee,
    dailyBreakdown: dailyOrders.map((day) => ({
      date: day.date,
      count: Number(day.count),
      total: Number(day.total),
    })),
  }
}

