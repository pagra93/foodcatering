/**
 * Validaciones Zod para Facturación
 * 
 * Schemas críticos para generación de facturas, cálculos financieros
 * y exportación a ERP. MÁXIMA PRECISIÓN requerida.
 */

import { z } from 'zod'
import { createHash } from 'crypto'

/**
 * Schema para generar factura
 */
export const generateInvoiceSchema = z.object({
  companyId: z.string().uuid('ID de empresa inválido'),
  
  period: z.object({
    year: z
      .number()
      .int('Año debe ser entero')
      .min(2020, 'Año mínimo: 2020')
      .max(2100, 'Año máximo: 2100'),
    month: z
      .number()
      .int('Mes debe ser entero')
      .min(1, 'Mes mínimo: 1')
      .max(12, 'Mes máximo: 12'),
  }),
  
  notes: z
    .string()
    .max(1000, 'Las notas no pueden superar 1000 caracteres')
    .optional()
    .nullable(),
})

/**
 * Schema para filtros de facturas
 */
export const invoiceFiltersSchema = z.object({
  companyId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  year: z.number().int().optional(),
  month: z.number().int().min(1).max(12).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

/**
 * Schema para actualizar estado de factura
 */
export const updateInvoiceStatusSchema = z.object({
  // 'PAID' se excluye a propósito: marcar como pagada va por la ruta /pagar
  // (markInvoiceAsPaid), que fija paidAt y evita el doble pago (M1).
  status: z.enum(['DRAFT', 'ISSUED', 'SENT', 'OVERDUE', 'CANCELLED', 'VOID'], {
    required_error: 'El estado es obligatorio',
  }),
  notes: z.string().max(1000).optional().nullable(),
})

/**
 * Schema para marcar factura como pagada
 */
export const markInvoiceAsPaidSchema = z.object({
  paidAt: z.coerce.date({
    required_error: 'La fecha de pago es obligatoria',
  }),
  paymentMethod: z
    .string()
    .min(2, 'Método de pago mínimo 2 caracteres')
    .max(50, 'Método de pago máximo 50 caracteres')
    .optional()
    .nullable(),
  transactionReference: z
    .string()
    .max(100, 'Referencia máximo 100 caracteres')
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().nullable(),
})

/**
 * Schema para exportar a ERP
 */
export const exportToERPSchema = z.object({
  invoiceIds: z
    .array(z.string().uuid('ID de factura inválido'))
    .min(1, 'Debe seleccionar al menos una factura')
    .max(100, 'Máximo 100 facturas por exportación'),
  format: z.enum(['CSV', 'EXCEL', 'JSON'], {
    required_error: 'El formato es obligatorio',
  }),
  includeDetails: z.boolean().optional().default(true),
})

/**
 * Schema para parámetros de reportes
 */
export const reportParamsSchema = z.object({
  startDate: z.coerce.date({
    required_error: 'La fecha de inicio es obligatoria',
  }),
  endDate: z.coerce.date({
    required_error: 'La fecha de fin es obligatoria',
  }),
  companyId: z.string().uuid().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'company']).optional(),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate'],
  }
)

/**
 * Tipos inferidos
 */
export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>
export type InvoiceFilters = z.infer<typeof invoiceFiltersSchema>
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>
export type MarkInvoiceAsPaidInput = z.infer<typeof markInvoiceAsPaidSchema>
export type ExportToERPInput = z.infer<typeof exportToERPSchema>
export type ReportParams = z.infer<typeof reportParamsSchema>

/**
 * Estados de factura con labels
 */
export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelada',
}

/**
 * Colores de estados
 */
export const INVOICE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800' },
  SENT: { bg: 'bg-blue-100', text: 'text-blue-800' },
  PAID: { bg: 'bg-green-100', text: 'text-green-800' },
  OVERDUE: { bg: 'bg-red-100', text: 'text-red-800' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

/**
 * Helper: Generar número de factura
 * Formato: CATERING-YYYY-MM-XXXX
 */
export function generateInvoiceNumber(
  year: number,
  month: number,
  sequence: number
): string {
  const paddedMonth = month.toString().padStart(2, '0')
  const paddedSequence = sequence.toString().padStart(4, '0')
  return `CATERING-${year}-${paddedMonth}-${paddedSequence}`
}

/**
 * Helper: Calcular hash de integridad de factura
 * SHA-256 de: invoiceNumber + companyId + totalAmount + itemsCount
 */
export function calculateInvoiceHash(data: {
  invoiceNumber: string
  companyId: string
  totalAmount: string | number
  itemsCount: number
}): string {
  const content = [
    data.invoiceNumber,
    data.companyId,
    data.totalAmount.toString(),
    data.itemsCount.toString(),
  ].join('|')

  return createHash('sha256').update(content).digest('hex')
}

/**
 * Helper: Validar hash de integridad
 */
export function validateInvoiceHash(
  invoice: {
    invoiceNumber: string
    companyId: string
    totalAmount: string | number
    integrityHash: string
  },
  itemsCount: number
): boolean {
  const expectedHash = calculateInvoiceHash({
    invoiceNumber: invoice.invoiceNumber,
    companyId: invoice.companyId,
    totalAmount: invoice.totalAmount,
    itemsCount,
  })

  return expectedHash === invoice.integrityHash
}

/**
 * Helper: Calcular IVA (21% estándar en España)
 */
export function calculateIVA(subtotal: number, rate: number = 0.21): number {
  return Math.round(subtotal * rate * 100) / 100
}

/**
 * Helper: Validar límite fiscal IRPF (11€/día nominativo)
 */
export function validateFiscalLimit(amount: number): {
  valid: boolean
  exceeds: number
} {
  const LIMIT = 11.0
  const exceeds = amount > LIMIT ? amount - LIMIT : 0

  return {
    valid: amount <= LIMIT,
    exceeds: Math.round(exceeds * 100) / 100,
  }
}

/**
 * Helper: Formatear moneda (EUR)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Helper: Redondear a 2 decimales (importante para evitar errores de precisión)
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Helper: Sumar array de números con precisión
 */
export function sumWithPrecision(numbers: number[]): number {
  const sum = numbers.reduce((acc, num) => acc + num, 0)
  return roundToTwoDecimals(sum)
}

/**
 * Helper: Obtener período anterior
 */
export function getPreviousPeriod(year: number, month: number): {
  year: number
  month: number
} {
  if (month === 1) {
    return { year: year - 1, month: 12 }
  }
  return { year, month: month - 1 }
}

/**
 * Helper: Obtener período siguiente
 */
export function getNextPeriod(year: number, month: number): {
  year: number
  month: number
} {
  if (month === 12) {
    return { year: year + 1, month: 1 }
  }
  return { year, month: month + 1 }
}

/**
 * Helper: Obtener rango de fechas del período
 */
export function getPeriodDateRange(year: number, month: number): {
  startDate: Date
  endDate: Date
} {
  const startDate = new Date(year, month - 1, 1)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(year, month, 0) // Último día del mes
  endDate.setHours(23, 59, 59, 999)

  return { startDate, endDate }
}

/**
 * Helper: Validar que el período puede facturarse
 */
export function canGenerateInvoiceForPeriod(year: number, month: number): {
  valid: boolean
  reason?: string
} {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // No se puede facturar el futuro
  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    return {
      valid: false,
      reason: 'No se puede facturar períodos futuros',
    }
  }

  // No se puede facturar más de 2 años atrás (límite razonable)
  if (year < currentYear - 2) {
    return {
      valid: false,
      reason: 'El período es demasiado antiguo',
    }
  }

  return { valid: true }
}

/**
 * Helper: Formatear período para display
 */
export function formatPeriod(year: number, month: number): string {
  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  return `${monthNames[month - 1]} ${year}`
}

