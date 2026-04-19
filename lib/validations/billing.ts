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

export const companyPlanEnum = z.enum(['STARTER', 'GROWTH', 'ENTERPRISE'])

export const updateSaasPlanSchema = z.object({
  code: companyPlanEnum,
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  monthlyPrice: z.number().nonnegative().max(10000),
  yearlyPrice: z.number().nonnegative().max(100000).optional(),
  maxEmployees: z.number().int().positive().optional(),
  maxOrdersMonth: z.number().int().positive().optional(),
  supportLevel: z.enum(['BASIC', 'PRIORITY', 'DEDICATED']),
  active: z.boolean(),
})

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
