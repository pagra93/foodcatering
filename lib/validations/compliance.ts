import { z } from 'zod'

// ─── Retención ─────────────────────────────────────────────────────────

export const retentionEntityEnum = z.enum([
  'AuditLog',
  'Order',
  'Invoice',
  'User',
  'Notification',
  'DailySnapshot',
  'Incident',
  'OrderHistory',
  'DeliveryProof',
])

export const retentionDeleteModeEnum = z.enum(['SOFT', 'HARD'])

export const updateRetentionPolicySchema = z.object({
  entity: retentionEntityEnum,
  retentionDays: z.number().int().min(1).max(3650), // max 10 años
  deleteMode: retentionDeleteModeEnum,
})

// ─── RGPD ──────────────────────────────────────────────────────────────

export const gdprTypeEnum = z.enum([
  'ACCESS',
  'ERASURE',
  'PORTABILITY',
  'RECTIFICATION',
])

export const createGdprRequestSchema = z.object({
  userId: z.string().uuid(),
  type: gdprTypeEnum,
  notes: z.string().max(2000).optional(),
})
export type CreateGdprRequestInput = z.infer<typeof createGdprRequestSchema>

export const resolveGdprRequestSchema = z.object({
  requestId: z.string().uuid(),
  confirmation: z.string().optional(), // Para ERASURE debe ser "ANONIMIZAR"
})

export const rejectGdprRequestSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().min(10, 'Explica el motivo del rechazo').max(1000),
})

export const GDPR_RESPONSE_DAYS = 30

// ─── DPA ───────────────────────────────────────────────────────────────

export const createDpaAgreementSchema = z.object({
  tenantId: z.string().uuid(),
  version: z.string().min(1).max(50),
  pdfUrl: z.string().url('URL del PDF inválida'),
  signedAt: z.coerce.date(),
  signedByName: z.string().min(2).max(200),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
})
export type CreateDpaInput = z.infer<typeof createDpaAgreementSchema>

// ─── Security ──────────────────────────────────────────────────────────

export const securityCheckCategoryEnum = z.enum([
  'OWASP_A01_ACCESS_CONTROL',
  'OWASP_A02_CRYPTO_FAILURES',
  'OWASP_A03_INJECTION',
  'OWASP_A04_INSECURE_DESIGN',
  'OWASP_A05_SECURITY_MISCONFIG',
  'OWASP_A06_VULNERABLE_COMPONENTS',
  'OWASP_A07_AUTH_FAILURES',
  'OWASP_A08_DATA_INTEGRITY',
  'OWASP_A09_LOGGING_MONITORING',
  'OWASP_A10_SSRF',
])

export const securityCheckStatusEnum = z.enum([
  'VERIFIED',
  'FAILED',
  'PENDING',
])

export const upsertSecurityCheckSchema = z.object({
  id: z.string().uuid().optional(),
  category: securityCheckCategoryEnum,
  item: z.string().min(5).max(500),
  status: securityCheckStatusEnum,
  evidence: z.string().max(2000).optional(),
})

export const securityReportSeverityEnum = z.enum([
  'INFO',
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
])

export const createSecurityReportSchema = z.object({
  title: z.string().min(3).max(200),
  scanner: z.string().min(2).max(200),
  scannedAt: z.coerce.date(),
  pdfUrl: z.string().url(),
  severity: securityReportSeverityEnum,
  notes: z.string().max(2000).optional(),
})
export type CreateSecurityReportInput = z.infer<
  typeof createSecurityReportSchema
>
