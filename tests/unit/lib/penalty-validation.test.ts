import { describe, it, expect } from 'vitest'
import {
  createPenaltySchema,
  disputePenaltySchema,
  waivePenaltySchema,
} from '@/lib/validations/penalty'

const validUuid = '11111111-2222-3333-4444-555555555555'

describe('penalty validations', () => {
  it('createPenaltySchema acepta datos válidos', () => {
    const result = createPenaltySchema.safeParse({
      tenantCatering: validUuid,
      type: 'MANUAL',
      reason: 'Tres entregas fuera de ventana la semana del 12 de abril',
      amount: 150.5,
    })
    expect(result.success).toBe(true)
  })

  it('createPenaltySchema rechaza importe negativo', () => {
    const result = createPenaltySchema.safeParse({
      tenantCatering: validUuid,
      type: 'MANUAL',
      reason: 'razón suficiente',
      amount: -10,
    })
    expect(result.success).toBe(false)
  })

  it('createPenaltySchema rechaza razón demasiado corta', () => {
    const result = createPenaltySchema.safeParse({
      tenantCatering: validUuid,
      type: 'MANUAL',
      reason: 'x',
      amount: 10,
    })
    expect(result.success).toBe(false)
  })

  it('createPenaltySchema valida los tipos permitidos', () => {
    for (const type of [
      'SLA_BREACH',
      'DOC_EXPIRED',
      'INCIDENT_THRESHOLD',
      'MANUAL',
    ]) {
      const result = createPenaltySchema.safeParse({
        tenantCatering: validUuid,
        type,
        reason: 'razón suficiente',
        amount: 50,
      })
      expect(result.success, `tipo ${type}`).toBe(true)
    }
  })

  it('disputePenaltySchema exige motivo de 10+ caracteres', () => {
    const ok = disputePenaltySchema.safeParse({
      penaltyId: validUuid,
      reason: 'El retraso fue por circunstancias ajenas al catering',
    })
    expect(ok.success).toBe(true)

    const fail = disputePenaltySchema.safeParse({
      penaltyId: validUuid,
      reason: 'corto',
    })
    expect(fail.success).toBe(false)
  })

  it('waivePenaltySchema exige motivo', () => {
    const result = waivePenaltySchema.safeParse({
      penaltyId: validUuid,
      reason: 'Se acepta el argumento del catering',
    })
    expect(result.success).toBe(true)
  })
})
