/**
 * Queries para Facturación del Catering
 * 
 * CRÍTICO: Precisión máxima en cálculos financieros
 * - Solo pedidos DELIVERED
 * - Usar priceOverride si existe, sino basePrice
 * - Snapshot inmutable con hash de integridad
 * - Compliance fiscal (11€/día límite IRPF)
 */

import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import type { GenerateInvoiceInput, InvoiceFilters } from '@/lib/validations/invoice'
import {
  generateInvoiceNumber,
  calculateInvoiceHash,
  getPeriodDateRange,
  roundToTwoDecimals,
  sumWithPrecision,
} from '@/lib/validations/invoice'

/**
 * Generar factura para una empresa en un período
 * 
 * IMPORTANTE: Esta función es CRÍTICA y debe mantener precisión decimal
 */
export async function generateInvoice(
  tenantId: string,
  data: GenerateInvoiceInput
) {
  const { companyId, period, notes } = data
  const { year, month } = period

  return await prisma.$transaction(async (tx) => {
    // 1. Verificar que la empresa existe y pertenece al tenant
    const company = await tx.company.findFirst({
      where: {
        id: companyId,
        tenantId,
      },
      select: {
        id: true,
        name: true,
        taxId: true,
        billingAddress: true,
      },
    })

    if (!company) {
      throw new Error('Empresa no encontrada')
    }

    // 2. Verificar si ya existe factura para este período
    const existingInvoice = await tx.invoice.findFirst({
      where: {
        tenantId,
        companyId,
        periodYear: year,
        periodMonth: month,
        status: { not: 'CANCELLED' },
      },
    })

    if (existingInvoice) {
      throw new Error('Ya existe una factura para este período')
    }

    // 3. Obtener rango de fechas del período
    const { startDate, endDate } = getPeriodDateRange(year, month)

    // 4. Obtener todos los pedidos DELIVERED del período
    const orders = await tx.order.findMany({
      where: {
        tenantId,
        companySite: {
          companyId,
        },
        serviceDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'DELIVERED', // SOLO DELIVERED
        deletedAt: null,
      },
      include: {
        dishSelection: true,
        companySite: {
          select: {
            id: true,
            name: true,
          },
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        serviceDate: 'asc',
      },
    })

    if (orders.length === 0) {
      throw new Error('No hay pedidos entregados en este período')
    }

    // 5. Obtener precios de platos (con priceOverride si existe)
    const allDishIds = new Set<string>()
    orders.forEach((order) => {
      if (order.dishSelection) {
        const selection = order.dishSelection as any
        if (selection.firstId) allDishIds.add(selection.firstId)
        if (selection.secondId) allDishIds.add(selection.secondId)
        if (selection.dessertId) allDishIds.add(selection.dessertId)
      }
    })

    const dishes = await tx.dish.findMany({
      where: {
        id: { in: Array.from(allDishIds) },
      },
      select: {
        id: true,
        name: true,
        course: true,
        basePrice: true,
      },
    })

    const dishMap = new Map(dishes.map((d) => [d.id, d]))

    // 6. Obtener priceOverrides del período (de DishSchedule)
    const dishSchedules = await tx.dishSchedule.findMany({
      where: {
        tenantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        dishId: { in: Array.from(allDishIds) },
      },
      select: {
        dishId: true,
        date: true,
        priceOverride: true,
      },
    })

    // Map: dishId + date -> priceOverride
    const priceOverrideMap = new Map<string, number>()
    dishSchedules.forEach((schedule) => {
      if (schedule.priceOverride) {
        const key = `${schedule.dishId}|${schedule.date.toISOString().split('T')[0]}`
        priceOverrideMap.set(key, Number(schedule.priceOverride))
      }
    })

    // 7. Calcular precio de cada pedido
    type OrderWithPrice = {
      orderId: string
      serviceDate: Date
      siteName: string
      employeeName: string
      dishes: Array<{
        name: string
        course: string
        price: number
      }>
      subtotal: number
    }

    const ordersWithPrices: OrderWithPrice[] = []
    let totalSubtotal = 0

    orders.forEach((order) => {
      if (!order.dishSelection) return

      const selection = order.dishSelection as any
      const dateKey = order.serviceDate.toISOString().split('T')[0]
      const dishes: OrderWithPrice['dishes'] = []

      let orderSubtotal = 0

      // Primer plato
      if (selection.firstId) {
        const dish = dishMap.get(selection.firstId)
        if (dish) {
          const overrideKey = `${selection.firstId}|${dateKey}`
          const price = priceOverrideMap.get(overrideKey) || Number(dish.basePrice)
          dishes.push({
            name: dish.name,
            course: dish.course,
            price: roundToTwoDecimals(price),
          })
          orderSubtotal += price
        }
      }

      // Segundo plato
      if (selection.secondId) {
        const dish = dishMap.get(selection.secondId)
        if (dish) {
          const overrideKey = `${selection.secondId}|${dateKey}`
          const price = priceOverrideMap.get(overrideKey) || Number(dish.basePrice)
          dishes.push({
            name: dish.name,
            course: dish.course,
            price: roundToTwoDecimals(price),
          })
          orderSubtotal += price
        }
      }

      // Postre
      if (selection.dessertId) {
        const dish = dishMap.get(selection.dessertId)
        if (dish) {
          const overrideKey = `${selection.dessertId}|${dateKey}`
          const price = priceOverrideMap.get(overrideKey) || Number(dish.basePrice)
          dishes.push({
            name: dish.name,
            course: dish.course,
            price: roundToTwoDecimals(price),
          })
          orderSubtotal += price
        }
      }

      ordersWithPrices.push({
        orderId: order.id,
        serviceDate: order.serviceDate,
        siteName: order.companySite.name,
        employeeName: `${order.employee.firstName} ${order.employee.lastName}`,
        dishes,
        subtotal: roundToTwoDecimals(orderSubtotal),
      })

      totalSubtotal += orderSubtotal
    })

    // 8. Calcular totales con precisión
    const subtotal = roundToTwoDecimals(totalSubtotal)
    const taxRate = new Prisma.Decimal(0.21) // 21% IVA
    const taxAmount = roundToTwoDecimals(subtotal * 0.21)
    const totalAmount = roundToTwoDecimals(subtotal + taxAmount)

    // 9. Generar número de factura (secuencial por período)
    const lastInvoice = await tx.invoice.findFirst({
      where: {
        tenantId,
        periodYear: year,
        periodMonth: month,
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    })

    const sequence = lastInvoice ? 
      (parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0') + 1) : 
      1

    const invoiceNumber = generateInvoiceNumber(year, month, sequence)

    // 10. Generar hash de integridad
    const integrityHash = calculateInvoiceHash({
      invoiceNumber,
      companyId,
      totalAmount,
      itemsCount: orders.length,
    })

    // 11. Crear snapshot inmutable (JSON)
    const snapshot = {
      company: {
        id: company.id,
        name: company.name,
        taxId: company.taxId,
        billingAddress: company.billingAddress,
      },
      period: { year, month },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      orders: ordersWithPrices,
      totals: {
        orderCount: orders.length,
        subtotal,
        taxRate: 0.21,
        taxAmount,
        totalAmount,
      },
      generatedAt: new Date().toISOString(),
      integrityHash,
    }

    // 12. Crear factura
    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        companyId,
        invoiceNumber,
        periodYear: year,
        periodMonth: month,
        startDate,
        endDate,
        subtotal: new Prisma.Decimal(subtotal),
        taxRate,
        taxAmount: new Prisma.Decimal(taxAmount),
        totalAmount: new Prisma.Decimal(totalAmount),
        status: 'DRAFT',
        integrityHash,
        snapshot,
        notes,
      },
    })

    // 13. Asociar pedidos a la factura
    await tx.order.updateMany({
      where: {
        id: { in: orders.map((o) => o.id) },
      },
      data: {
        invoiceId: invoice.id,
      },
    })

    // 14. Crear audit log
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: 'system', // TODO: Pasar userId del usuario que genera
        action: 'INVOICE_GENERATED',
        resourceType: 'Invoice',
        resourceId: invoice.id,
        metadata: {
          invoiceNumber,
          companyId,
          period: { year, month },
          totalAmount,
          orderCount: orders.length,
        },
      },
    })

    return {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      orderCount: orders.length,
      company: {
        id: company.id,
        name: company.name,
      },
    }
  })
}

/**
 * Obtener facturas con filtros
 */
export async function getInvoices(tenantId: string, filters?: InvoiceFilters) {
  const whereClause: any = { tenantId }

  if (filters?.companyId) {
    whereClause.companyId = filters.companyId
  }

  if (filters?.status) {
    whereClause.status = filters.status
  }

  if (filters?.year) {
    whereClause.periodYear = filters.year
  }

  if (filters?.month) {
    whereClause.periodMonth = filters.month
  }

  if (filters?.startDate || filters?.endDate) {
    whereClause.startDate = {}
    if (filters.startDate) {
      whereClause.startDate.gte = filters.startDate
    }
    if (filters.endDate) {
      whereClause.startDate.lte = filters.endDate
    }
  }

  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    include: {
      company: {
        select: {
          id: true,
          name: true,
          taxId: true,
        },
      },
      _count: {
        select: {
          orders: true,
        },
      },
    },
    orderBy: [
      { periodYear: 'desc' },
      { periodMonth: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  return invoices.map((invoice) => ({
    ...invoice,
    subtotal: Number(invoice.subtotal),
    taxRate: Number(invoice.taxRate),
    taxAmount: Number(invoice.taxAmount),
    totalAmount: Number(invoice.totalAmount),
    orderCount: invoice._count.orders,
  }))
}

/**
 * Obtener una factura por ID
 */
export async function getInvoiceById(tenantId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      tenantId,
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          taxId: true,
          billingAddress: true,
          billingEmail: true,
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
            },
          },
          companySite: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          serviceDate: 'asc',
        },
      },
    },
  })

  if (!invoice) {
    return null
  }

  return {
    ...invoice,
    subtotal: Number(invoice.subtotal),
    taxRate: Number(invoice.taxRate),
    taxAmount: Number(invoice.taxAmount),
    totalAmount: Number(invoice.totalAmount),
    orderCount: invoice.orders.length,
  }
}

/**
 * Actualizar estado de factura
 */
export async function updateInvoiceStatus(
  tenantId: string,
  invoiceId: string,
  status: string,
  notes?: string
) {
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    })

    if (!invoice) {
      throw new Error('Factura no encontrada')
    }

    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        notes: notes || invoice.notes,
        sentAt: status === 'SENT' && !invoice.sentAt ? new Date() : invoice.sentAt,
      },
    })

    // Audit log
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: 'system', // TODO: userId
        action: 'INVOICE_STATUS_CHANGED',
        resourceType: 'Invoice',
        resourceId: invoiceId,
        metadata: {
          previousStatus: invoice.status,
          newStatus: status,
        },
      },
    })

    return {
      ...updated,
      subtotal: Number(updated.subtotal),
      taxAmount: Number(updated.taxAmount),
      totalAmount: Number(updated.totalAmount),
    }
  })
}

/**
 * Marcar factura como pagada
 */
export async function markInvoiceAsPaid(
  tenantId: string,
  invoiceId: string,
  paidAt: Date,
  paymentMethod?: string,
  transactionReference?: string,
  notes?: string
) {
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    })

    if (!invoice) {
      throw new Error('Factura no encontrada')
    }

    if (invoice.status === 'PAID') {
      throw new Error('La factura ya está marcada como pagada')
    }

    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt,
        paymentMethod,
        transactionReference,
        notes: notes || invoice.notes,
      },
    })

    // Audit log
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: 'system', // TODO: userId
        action: 'INVOICE_PAID',
        resourceType: 'Invoice',
        resourceId: invoiceId,
        metadata: {
          paidAt: paidAt.toISOString(),
          amount: Number(invoice.totalAmount),
          paymentMethod,
          transactionReference,
        },
      },
    })

    return {
      ...updated,
      subtotal: Number(updated.subtotal),
      taxAmount: Number(updated.taxAmount),
      totalAmount: Number(updated.totalAmount),
    }
  })
}

/**
 * Cancelar factura
 */
export async function cancelInvoice(
  tenantId: string,
  invoiceId: string,
  reason: string
) {
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    })

    if (!invoice) {
      throw new Error('Factura no encontrada')
    }

    if (invoice.status === 'PAID') {
      throw new Error('No se puede cancelar una factura pagada')
    }

    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'CANCELLED',
        notes: `${invoice.notes || ''}\n\nCANCELADA: ${reason}`.trim(),
      },
    })

    // Desasociar pedidos
    await tx.order.updateMany({
      where: { invoiceId },
      data: { invoiceId: null },
    })

    // Audit log
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: 'system', // TODO: userId
        action: 'INVOICE_CANCELLED',
        resourceType: 'Invoice',
        resourceId: invoiceId,
        metadata: {
          reason,
          previousStatus: invoice.status,
        },
      },
    })

    return {
      ...updated,
      subtotal: Number(updated.subtotal),
      taxAmount: Number(updated.taxAmount),
      totalAmount: Number(updated.totalAmount),
    }
  })
}

/**
 * Obtener estadísticas de facturación
 */
export async function getInvoiceStats(tenantId: string, year?: number) {
  const whereClause: any = { tenantId }

  if (year) {
    whereClause.periodYear = year
  }

  const [total, draft, sent, paid, overdue, totalAmount] = await Promise.all([
    prisma.invoice.count({ where: whereClause }),
    prisma.invoice.count({ where: { ...whereClause, status: 'DRAFT' } }),
    prisma.invoice.count({ where: { ...whereClause, status: 'SENT' } }),
    prisma.invoice.count({ where: { ...whereClause, status: 'PAID' } }),
    prisma.invoice.count({ where: { ...whereClause, status: 'OVERDUE' } }),
    prisma.invoice.aggregate({
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
    }),
  ])

  return {
    total,
    draft,
    sent,
    paid,
    overdue,
    totalAmount: Number(totalAmount._sum.totalAmount || 0),
  }
}

