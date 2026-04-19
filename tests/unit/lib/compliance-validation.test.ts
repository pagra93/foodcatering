import { describe, it, expect } from 'vitest'
import {
  createDpaAgreementSchema,
  createGdprRequestSchema,
  createSecurityReportSchema,
  rejectGdprRequestSchema,
  updateRetentionPolicySchema,
} from '@/lib/validations/compliance'

const validUuid = '11111111-2222-3333-4444-555555555555'

describe('compliance validations', () => {
  describe('retention policy', () => {
    it('acepta configuración válida', () => {
      const r = updateRetentionPolicySchema.safeParse({
        entity: 'Invoice',
        retentionDays: 1825,
        deleteMode: 'SOFT',
      })
      expect(r.success).toBe(true)
    })

    it('rechaza retentionDays > 10 años', () => {
      const r = updateRetentionPolicySchema.safeParse({
        entity: 'Invoice',
        retentionDays: 4000,
        deleteMode: 'SOFT',
      })
      expect(r.success).toBe(false)
    })

    it('rechaza entidad desconocida', () => {
      const r = updateRetentionPolicySchema.safeParse({
        entity: 'Foo',
        retentionDays: 30,
        deleteMode: 'SOFT',
      })
      expect(r.success).toBe(false)
    })
  })

  describe('gdpr request', () => {
    it('acepta solicitud de ACCESS', () => {
      const r = createGdprRequestSchema.safeParse({
        userId: validUuid,
        type: 'ACCESS',
      })
      expect(r.success).toBe(true)
    })

    it('acepta los 4 tipos RGPD', () => {
      for (const type of ['ACCESS', 'ERASURE', 'PORTABILITY', 'RECTIFICATION']) {
        const r = createGdprRequestSchema.safeParse({
          userId: validUuid,
          type,
        })
        expect(r.success, `type ${type}`).toBe(true)
      }
    })

    it('rechazo: motivo mínimo 10 caracteres', () => {
      const ok = rejectGdprRequestSchema.safeParse({
        requestId: validUuid,
        reason: 'Motivo suficientemente largo',
      })
      expect(ok.success).toBe(true)

      const fail = rejectGdprRequestSchema.safeParse({
        requestId: validUuid,
        reason: 'corto',
      })
      expect(fail.success).toBe(false)
    })
  })

  describe('DPA', () => {
    it('acepta DPA válido', () => {
      const r = createDpaAgreementSchema.safeParse({
        tenantId: validUuid,
        version: '1.0',
        pdfUrl: 'https://drive.google.com/file/d/abc',
        signedAt: '2026-04-19',
        signedByName: 'Laura García',
        effectiveFrom: '2026-04-19',
      })
      expect(r.success).toBe(true)
    })

    it('rechaza URL inválida', () => {
      const r = createDpaAgreementSchema.safeParse({
        tenantId: validUuid,
        version: '1.0',
        pdfUrl: 'no-es-url',
        signedAt: '2026-04-19',
        signedByName: 'Laura García',
        effectiveFrom: '2026-04-19',
      })
      expect(r.success).toBe(false)
    })
  })

  describe('Security report', () => {
    it('acepta informe con severidad válida', () => {
      const r = createSecurityReportSchema.safeParse({
        title: 'Pentest Q2 2026',
        scanner: 'Acme Security',
        scannedAt: '2026-04-01',
        pdfUrl: 'https://drive.google.com/file/d/xyz',
        severity: 'MEDIUM',
      })
      expect(r.success).toBe(true)
    })

    it('rechaza severidad desconocida', () => {
      const r = createSecurityReportSchema.safeParse({
        title: 'Pentest',
        scanner: 'Acme',
        scannedAt: '2026-04-01',
        pdfUrl: 'https://drive.google.com/file/d/xyz',
        severity: 'DESCONOCIDA',
      })
      expect(r.success).toBe(false)
    })
  })
})
