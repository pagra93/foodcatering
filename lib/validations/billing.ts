import { z } from 'zod'

export const settlementStatusEnum = z.enum([
  'DRAFT',
  'ISSUED',
  'PAID',
  'OVERDUE',
  'CANCELLED',
])

export const saasInvoiceStatusEnum = z.enum([
  'DRAFT',
  'ISSUED',
  'PAID',
  'OVERDUE',
  'CANCELLED',
])

// Los planes SaaS se gestionan en components/admin/billing/plan-actions.ts
// (crear/editar/borrar + features + límites + planes a medida).

export const markPaidSchema = z.object({
  id: z.string().uuid(),
  paymentRef: z.string().max(200).optional(),
  paymentMethod: z.string().max(100).optional(),
})

export const updateTaxRuleSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(200),
  rate: z.number().nonnegative().max(100),
  category: z.string().min(2).max(50),
  region: z.string().max(10).optional(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().optional(),
  active: z.boolean(),
})

export const generateMonthSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM requerido'),
  dryRun: z.boolean().default(false),
})

export const DEFAULT_DUE_DAYS = 15
