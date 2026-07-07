/**
 * Queries para Facturación del Catering
 *
 * Precisión máxima en cálculos financieros:
 * - Solo pedidos DELIVERED entran en la factura
 * - Se usa `priceOverride` si el DishSchedule del día lo define, si no `Dish.basePrice`
 * - Snapshot inmutable JSON + hash de integridad SHA-256
 * - Compliance fiscal (límite IRPF 11€/día lo fijan otras queries)
 *
 * El parámetro `tenantId` es siempre el tenant del CATERING (emisor de la factura).
 */

import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import type { GenerateInvoiceInput, InvoiceFilters } from '@/lib/validations/invoice'
import { sendEmail, getAppBaseUrl } from '@/lib/email/client'
import { invoiceIssuedEmail } from '@/lib/email/templates'
import {
  generateInvoiceNumber,
  calculateInvoiceHash,
  getPeriodDateRange,
  roundToTwoDecimals,
} from '@/lib/validations/invoice'

// IVA por defecto de comida (hostelería) si no hubiera regla activa en el
// catálogo fiscal. El valor real se lee de TaxRule (categoría 'food'), editable
// desde /admin/billing/taxes.
const DEFAULT_FOOD_TAX_PCT = 10

function formatPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function parsePeriod(period: string): { year: number; month: number } {
  const [y, m] = period.split('-')
  return { year: Number(y ?? 0), month: Number(m ?? 0) }
}

/**
 * Generar factura para una empresa en un período (año+mes).
 */
export async function generateInvoice(
  tenantId: string,
  data: GenerateInvoiceInput,
  actorUserId: string
) {
  const { companyId, period, notes } = data
  const { year, month } = period
  const periodStr = formatPeriod(year, month)

  return prisma.$transaction(async (tx) => {
    // 1. Empresa debe existir
    const company = await tx.company.findFirst({
      where: { id: companyId },
      select: {
        id: true,
        tenantId: true,
        legalName: true,
        cif: true,
        billingAddress: true,
      },
    })

    if (!company) {
      throw new Error('Empresa no encontrada')
    }

    // 2. No puede existir otra factura no cancelada para el mismo período
    const existing = await tx.invoice.findFirst({
      where: {
        tenantCatering: tenantId,
        tenantEmpresa: company.tenantId,
        period: periodStr,
        status: { notIn: ['CANCELLED', 'VOID'] },
      },
    })
    if (existing) {
      throw new Error('Ya existe una factura para este período')
    }

    // 3. Rango de fechas del período
    const { startDate, endDate } = getPeriodDateRange(year, month)

    // 4. Pedidos DELIVERED del período (del catering, a esta empresa, en sus sedes)
    const orders = await tx.order.findMany({
      where: {
        tenantCatering: tenantId,
        tenantEmpresa: company.tenantId,
        serviceDate: { gte: startDate, lte: endDate },
        status: 'DELIVERED',
        deletedAt: null,
      },
      orderBy: { serviceDate: 'asc' },
    })

    if (orders.length === 0) {
      throw new Error('No hay pedidos entregados en este período')
    }

    // 5. IDs de platos involucrados en las selecciones JSON
    const allDishIds = new Set<string>()
    for (const order of orders) {
      const selection = order.selection as Record<string, unknown>
      const firstId = selection['firstId']
      const secondId = selection['secondId']
      const dessertId = selection['dessertId']
      if (typeof firstId === 'string') allDishIds.add(firstId)
      if (typeof secondId === 'string') allDishIds.add(secondId)
      if (typeof dessertId === 'string') allDishIds.add(dessertId)
    }

    const dishes = await tx.dish.findMany({
      where: { id: { in: Array.from(allDishIds) }, tenantId },
      select: { id: true, name: true, course: true, basePrice: true },
    })
    const dishMap = new Map(dishes.map((d) => [d.id, d]))

    // 6. Precio overrides por día (si existen en DishSchedule)
    const schedules = await tx.dishSchedule.findMany({
      where: {
        tenantId,
        dishId: { in: Array.from(allDishIds) },
        date: { gte: startDate, lte: endDate },
      },
      select: { dishId: true, date: true, priceOverride: true },
    })
    const overrideMap = new Map<string, number>()
    for (const s of schedules) {
      if (!s.priceOverride) continue
      const day = s.date.toISOString().slice(0, 10)
      overrideMap.set(`${s.dishId}|${day}`, Number(s.priceOverride))
    }

    // 7. Precargar info de empleados y sedes (Order no tiene esas relaciones)
    const employeeIds = Array.from(new Set(orders.map((o) => o.employeeId)))
    const siteIds = Array.from(new Set(orders.map((o) => o.siteId)))
    const [employees, sites] = await Promise.all([
      tx.employee.findMany({
        where: { id: { in: employeeIds } },
        include: { user: { select: { nameEnc: true } } },
      }),
      tx.companySite.findMany({
        where: { id: { in: siteIds } },
        select: { id: true, name: true },
      }),
    ])
    const employeeMap = new Map(employees.map((e) => [e.id, e]))
    const siteMap = new Map(sites.map((s) => [s.id, s]))

    // 8. Calcular líneas e importe por pedido
    type LineInput = {
      orderId: string
      employeeId: string
      date: Date
      concept: string
      amount: number
    }

    const lines: LineInput[] = []
    const snapshotOrders: Array<{
      orderId: string
      serviceDate: string
      siteName: string
      employeeName: string
      dishes: Array<{ name: string; course: string; price: number }>
      subtotal: number
    }> = []
    let totalSubtotal = 0

    for (const order of orders) {
      const selection = order.selection as Record<string, unknown>
      const dayKey = order.serviceDate.toISOString().slice(0, 10)
      const dishLines: Array<{ name: string; course: string; price: number }> = []
      let orderSubtotal = 0

      for (const key of ['firstId', 'secondId', 'dessertId'] as const) {
        const id = selection[key]
        if (typeof id !== 'string') continue
        const dish = dishMap.get(id)
        if (!dish) continue
        const price =
          overrideMap.get(`${id}|${dayKey}`) ?? Number(dish.basePrice)
        dishLines.push({
          name: dish.name,
          course: dish.course,
          price: roundToTwoDecimals(price),
        })
        orderSubtotal += price
      }

      const rounded = roundToTwoDecimals(orderSubtotal)
      const employee = employeeMap.get(order.employeeId)
      const site = siteMap.get(order.siteId)
      const employeeName = employee?.user.nameEnc ?? 'Desconocido'
      const concept = dishLines.map((d) => d.name).join(' + ') || 'Menú'

      lines.push({
        orderId: order.id,
        employeeId: order.employeeId,
        date: order.serviceDate,
        concept,
        amount: rounded,
      })

      snapshotOrders.push({
        orderId: order.id,
        serviceDate: order.serviceDate.toISOString(),
        siteName: site?.name ?? 'Desconocida',
        employeeName,
        dishes: dishLines,
        subtotal: rounded,
      })

      totalSubtotal += orderSubtotal
    }

    // 9. Totales — el IVA se lee del catálogo fiscal editable en admin
    // (categoría 'food' = hostelería, 10%), no hardcodeado. Fallback al 10%.
    const now = new Date()
    const foodTaxRule = await tx.taxRule.findFirst({
      where: {
        category: 'food',
        active: true,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
    })
    const taxRatePct = foodTaxRule
      ? Number(foodTaxRule.rate)
      : DEFAULT_FOOD_TAX_PCT

    const subtotal = roundToTwoDecimals(totalSubtotal)
    const taxAmount = roundToTwoDecimals((subtotal * taxRatePct) / 100)
    const totalAmount = roundToTwoDecimals(subtotal + taxAmount)

    // 10. Número correlativo por (catering, año-mes)
    const lastInvoice = await tx.invoice.findFirst({
      where: { tenantCatering: tenantId, period: periodStr },
      orderBy: { number: 'desc' },
    })
    const lastSequence = lastInvoice
      ? Number(lastInvoice.number.split('-').pop() ?? 0)
      : 0
    const number = generateInvoiceNumber(year, month, lastSequence + 1)

    // 11. Hash de integridad
    const integrityHash = calculateInvoiceHash({
      invoiceNumber: number,
      companyId,
      totalAmount,
      itemsCount: orders.length,
    })

    // 12. Crear factura + líneas + vincular pedidos en una sola transacción
    const invoice = await tx.invoice.create({
      data: {
        tenantCatering: tenantId,
        tenantEmpresa: company.tenantId,
        companyId: company.id,
        period: periodStr,
        number,
        issueDate: new Date(),
        dueDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
        startDate,
        endDate,
        subtotal: new Prisma.Decimal(subtotal),
        taxRate: new Prisma.Decimal(taxRatePct), // porcentaje, p.ej. 10.00
        taxAmount: new Prisma.Decimal(taxAmount),
        total: new Prisma.Decimal(totalAmount),
        status: 'DRAFT',
        integrityHash,
        notes: notes ?? null,
        snapshot: {
          company: {
            id: company.id,
            legalName: company.legalName,
            cif: company.cif,
            billingAddress: company.billingAddress,
          },
          period: { year, month },
          dateRange: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          orders: snapshotOrders,
          totals: {
            orderCount: orders.length,
            subtotal,
            taxRate: taxRatePct,
            taxAmount,
            totalAmount,
          },
          generatedAt: new Date().toISOString(),
          integrityHash,
        },
      },
    })

    await tx.invoiceLine.createMany({
      data: lines.map((l) => ({
        invoiceId: invoice.id,
        date: l.date,
        orderId: l.orderId,
        employeeId: l.employeeId,
        concept: l.concept,
        amount: new Prisma.Decimal(l.amount),
        facturableFlag: 'FULL',
      })),
    })

    await tx.order.updateMany({
      where: { id: { in: orders.map((o) => o.id) } },
      data: { invoiceId: invoice.id },
    })

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: actorUserId,
        action: 'INVOICE_GENERATED',
        entity: 'invoice',
        entityId: invoice.id,
        diff: {
          number,
          companyId,
          period: periodStr,
          totalAmount,
          orderCount: orders.length,
        },
        hash: integrityHash,
      },
    })

    return {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      orderCount: orders.length,
      company: {
        id: company.id,
        legalName: company.legalName,
      },
    }
  })
}

/**
 * Listar facturas del catering con filtros
 */
export async function getInvoices(tenantId: string, filters?: InvoiceFilters) {
  const where: Prisma.InvoiceWhereInput = { tenantCatering: tenantId }

  if (filters?.companyId) {
    where.companyId = filters.companyId
  }
  if (filters?.status) {
    where.status = filters.status as Prisma.InvoiceWhereInput['status']
  }
  if (filters?.year || filters?.month) {
    // period tiene formato "YYYY-MM"
    if (filters.year && filters.month) {
      where.period = formatPeriod(filters.year, filters.month)
    } else if (filters.year) {
      where.period = { startsWith: `${filters.year}-` }
    }
  }
  if (filters?.startDate || filters?.endDate) {
    where.startDate = {}
    if (filters.startDate) where.startDate.gte = filters.startDate
    if (filters.endDate) where.startDate.lte = filters.endDate
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      company: {
        select: { id: true, legalName: true, cif: true },
      },
      _count: { select: { orders: true, lines: true } },
    },
    orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
  })

  return invoices.map((invoice) => ({
    ...invoice,
    subtotal: Number(invoice.subtotal),
    taxRate: Number(invoice.taxRate),
    taxAmount: Number(invoice.taxAmount),
    total: Number(invoice.total),
    orderCount: invoice._count.orders,
  }))
}

/**
 * Obtener una factura por id
 */
export async function getInvoiceById(tenantId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantCatering: tenantId },
    include: {
      company: {
        select: {
          id: true,
          legalName: true,
          cif: true,
          billingAddress: true,
          contactFinanceEmail: true,
        },
      },
      lines: { orderBy: { date: 'asc' } },
      orders: {
        where: { deletedAt: null },
        select: {
          id: true,
          serviceDate: true,
          status: true,
          siteId: true,
          employeeId: true,
          price: true,
        },
        orderBy: { serviceDate: 'asc' },
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
    total: Number(invoice.total),
    orderCount: invoice.orders.length,
  }
}

/**
 * Actualizar estado de factura
 */
export async function updateInvoiceStatus(
  tenantId: string,
  invoiceId: string,
  status: 'DRAFT' | 'ISSUED' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'VOID',
  actorUserId: string,
  notes?: string
) {
  const { result, becameSent } = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantCatering: tenantId },
    })

    if (!invoice) {
      throw new Error('Factura no encontrada')
    }

    // Notificar a la empresa solo la PRIMERA vez que la factura pasa a "enviada".
    const becameSent = status === 'SENT' && invoice.status !== 'SENT'

    // Máquina de estados (M1): 'PAID' solo por la ruta de pago (markInvoiceAsPaid,
    // que fija paidAt y bloquea el doble pago); no se reabren facturas en estado
    // terminal (PAID/CANCELLED/VOID). Antes se aceptaba cualquier estado.
    if (status === 'PAID') {
      throw new Error(
        'Para marcar como pagada usa la acción de pago, no el cambio de estado.'
      )
    }
    const allowedNext: Record<string, string[]> = {
      DRAFT: ['ISSUED', 'SENT', 'CANCELLED', 'VOID'],
      ISSUED: ['SENT', 'OVERDUE', 'CANCELLED', 'VOID'],
      SENT: ['OVERDUE', 'CANCELLED', 'VOID'],
      OVERDUE: ['SENT', 'CANCELLED', 'VOID'],
      PAID: [],
      CANCELLED: [],
      VOID: [],
    }
    if (
      status !== invoice.status &&
      !(allowedNext[invoice.status] ?? []).includes(status)
    ) {
      throw new Error(
        `Transición de estado no permitida: ${invoice.status} → ${status}`
      )
    }

    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        notes: notes ?? invoice.notes,
        sentAt: status === 'SENT' && !invoice.sentAt ? new Date() : invoice.sentAt,
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: actorUserId,
        action: 'INVOICE_UPDATED',
        entity: 'invoice',
        entityId: invoiceId,
        diff: {
          previousStatus: invoice.status,
          newStatus: status,
        },
        hash: invoice.integrityHash ?? invoiceId,
      },
    })

    return {
      result: {
        ...updated,
        subtotal: Number(updated.subtotal),
        taxAmount: Number(updated.taxAmount),
        total: Number(updated.total),
      },
      becameSent,
    }
  })

  // Aviso de factura emitida a la empresa (fuera de la tx; no bloquea el cambio
  // de estado si el envío falla).
  if (becameSent) {
    const company = await prisma.company.findFirst({
      where: result.companyId
        ? { id: result.companyId }
        : { tenantId: result.tenantEmpresa },
      select: { contactFinanceEmail: true, contactRrhhEmail: true },
    })
    const to = company?.contactFinanceEmail ?? company?.contactRrhhEmail
    if (to) {
      const email = invoiceIssuedEmail({
        number: result.number,
        period: result.period,
        amount: result.total,
        dueDate: result.dueDate.toLocaleDateString('es-ES'),
        url: `${getAppBaseUrl()}/empresa/facturacion`,
      })
      await sendEmail({
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      })
    }
  }

  return result
}

/**
 * Marcar factura como pagada
 */
export async function markInvoiceAsPaid(
  tenantId: string,
  invoiceId: string,
  paidAt: Date,
  actorUserId: string,
  paymentMethod?: string,
  transactionReference?: string,
  notes?: string
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantCatering: tenantId },
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
        paymentMethod: paymentMethod ?? null,
        transactionReference: transactionReference ?? null,
        notes: notes ?? invoice.notes,
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: actorUserId,
        action: 'INVOICE_PAID',
        entity: 'invoice',
        entityId: invoiceId,
        diff: {
          paidAt: paidAt.toISOString(),
          amount: Number(invoice.total),
          paymentMethod,
          transactionReference,
        },
        hash: invoice.integrityHash ?? invoiceId,
      },
    })

    return {
      ...updated,
      subtotal: Number(updated.subtotal),
      taxAmount: Number(updated.taxAmount),
      total: Number(updated.total),
    }
  })
}

/**
 * Cancelar factura
 */
export async function cancelInvoice(
  tenantId: string,
  invoiceId: string,
  reason: string,
  actorUserId: string
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantCatering: tenantId },
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
        notes: `${invoice.notes ?? ''}\n\nCANCELADA: ${reason}`.trim(),
      },
    })

    await tx.order.updateMany({
      where: { invoiceId },
      data: { invoiceId: null },
    })

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: actorUserId,
        action: 'INVOICE_CANCELLED',
        entity: 'invoice',
        entityId: invoiceId,
        diff: {
          reason,
          previousStatus: invoice.status,
        },
        hash: invoice.integrityHash ?? invoiceId,
      },
    })

    return {
      ...updated,
      subtotal: Number(updated.subtotal),
      taxAmount: Number(updated.taxAmount),
      total: Number(updated.total),
    }
  })
}

/**
 * Estadísticas de facturación del catering
 */
export async function getInvoiceStats(tenantId: string, year?: number) {
  const where: Prisma.InvoiceWhereInput = { tenantCatering: tenantId }
  if (year) {
    where.period = { startsWith: `${year}-` }
  }

  const [total, draft, sent, paid, overdue, totalAgg] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.count({ where: { ...where, status: 'DRAFT' } }),
    prisma.invoice.count({ where: { ...where, status: 'SENT' } }),
    prisma.invoice.count({ where: { ...where, status: 'PAID' } }),
    prisma.invoice.count({ where: { ...where, status: 'OVERDUE' } }),
    prisma.invoice.aggregate({ where, _sum: { total: true } }),
  ])

  return {
    total,
    draft,
    sent,
    paid,
    overdue,
    totalAmount: totalAgg._sum.total ? Number(totalAgg._sum.total) : 0,
  }
}

export { parsePeriod, formatPeriod }
