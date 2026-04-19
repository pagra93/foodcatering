import { describe, it, expect } from 'vitest'
import { scheduleMaintenanceSchema } from '@/lib/validations/maintenance'

describe('maintenance window validation', () => {
  it('acepta ventana válida', () => {
    const r = scheduleMaintenanceSchema.safeParse({
      startsAt: '2026-05-01T02:00:00Z',
      endsAt: '2026-05-01T04:00:00Z',
      reason: 'Migración BD',
      message: 'Estamos actualizando la base de datos, volvemos en 2h.',
      allowedRoles: ['SUPER_ADMIN'],
    })
    expect(r.success).toBe(true)
  })

  it('rechaza endsAt anterior a startsAt', () => {
    const r = scheduleMaintenanceSchema.safeParse({
      startsAt: '2026-05-01T04:00:00Z',
      endsAt: '2026-05-01T02:00:00Z',
      reason: 'Migración BD',
      message: 'Estamos actualizando, volvemos pronto.',
    })
    expect(r.success).toBe(false)
  })

  it('rechaza razón demasiado corta', () => {
    const r = scheduleMaintenanceSchema.safeParse({
      startsAt: '2026-05-01T02:00:00Z',
      endsAt: '2026-05-01T04:00:00Z',
      reason: 'x',
      message: 'Mensaje de al menos 10 caracteres',
    })
    expect(r.success).toBe(false)
  })

  it('rechaza mensaje demasiado corto', () => {
    const r = scheduleMaintenanceSchema.safeParse({
      startsAt: '2026-05-01T02:00:00Z',
      endsAt: '2026-05-01T04:00:00Z',
      reason: 'Migración BD',
      message: 'corto',
    })
    expect(r.success).toBe(false)
  })

  it('allowedRoles default a SUPER_ADMIN', () => {
    const r = scheduleMaintenanceSchema.parse({
      startsAt: '2026-05-01T02:00:00Z',
      endsAt: '2026-05-01T04:00:00Z',
      reason: 'Migración BD',
      message: 'Estamos actualizando, volvemos pronto.',
    })
    expect(r.allowedRoles).toEqual(['SUPER_ADMIN'])
  })
})
