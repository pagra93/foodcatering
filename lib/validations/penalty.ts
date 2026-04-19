import { z } from 'zod'

export const penaltyTypeEnum = z.enum([
  'SLA_BREACH',
  'DOC_EXPIRED',
  'INCIDENT_THRESHOLD',
  'MANUAL',
])

export const penaltyStatusEnum = z.enum([
  'PENDING',
  'APPLIED',
  'DISPUTED',
  'WAIVED',
])

export const createPenaltySchema = z.object({
  tenantCatering: z.string().uuid(),
  companyId: z.string().uuid().optional(),
  type: penaltyTypeEnum,
  reason: z.string().min(5, 'Descripción demasiado corta').max(500),
  amount: z.number().positive('El importe debe ser positivo').max(100000),
  linkedIncidentId: z.string().uuid().optional(),
  linkedAuditId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
})
export type CreatePenaltyInput = z.infer<typeof createPenaltySchema>

export const applyPenaltySchema = z.object({
  penaltyId: z.string().uuid(),
})

export const waivePenaltySchema = z.object({
  penaltyId: z.string().uuid(),
  reason: z.string().min(5).max(500),
})

export const disputePenaltySchema = z.object({
  penaltyId: z.string().uuid(),
  reason: z.string().min(10, 'Explica los motivos con detalle').max(1000),
})

/**
 * Máximo número de días tras APPLIED durante los cuales el catering
 * puede disputar. Pasado este plazo el botón Disputar se oculta.
 */
export const DISPUTE_WINDOW_DAYS = 7
