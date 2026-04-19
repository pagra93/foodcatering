import { z } from 'zod'

export const auditTypeEnum = z.enum(['SANITARIA', 'OPERATIVA', 'SATISFACCION'])

export const createAuditSchema = z.object({
  tenantCatering: z.string().uuid(),
  auditType: auditTypeEnum,
  score: z.number().int().min(0).max(100),
  reportUrl: z.string().url().optional(),
  auditedAt: z.coerce.date(),
  notes: z.string().max(2000).optional(),
})
export type CreateAuditInput = z.infer<typeof createAuditSchema>

export const updateAuditSchema = createAuditSchema.partial().extend({
  auditId: z.string().uuid(),
})
