import { describe, it, expect } from 'vitest'
import { hasTenantFilter } from '@/lib/db/prisma'

describe('hasTenantFilter (guard de aislamiento F5)', () => {
  it('detecta las claves de tenant de primer nivel', () => {
    expect(hasTenantFilter({ tenantId: 'x' })).toBe(true)
    expect(hasTenantFilter({ tenantEmpresa: 'x' })).toBe(true)
    expect(hasTenantFilter({ tenantCatering: 'x' })).toBe(true)
    expect(hasTenantFilter({ tenant: { id: 'x' } })).toBe(true)
    expect(hasTenantFilter({ company: { tenantId: 'x' } })).toBe(true)
  })

  it('marca como SIN filtro un where vacío o solo por id/estado', () => {
    expect(hasTenantFilter({})).toBe(false)
    expect(hasTenantFilter({ id: 'x' })).toBe(false)
    expect(hasTenantFilter({ status: 'PAID' })).toBe(false)
    expect(hasTenantFilter(undefined)).toBe(false)
  })

  it('desciende en AND (array y objeto) — evita falsos positivos', () => {
    expect(
      hasTenantFilter({ AND: [{ status: 'PAID' }, { tenantId: 'x' }] })
    ).toBe(true)
    expect(hasTenantFilter({ AND: { tenantId: 'x' } })).toBe(true)
    expect(hasTenantFilter({ AND: [{ status: 'PAID' }] })).toBe(false)
  })

  it('desciende en OR', () => {
    expect(
      hasTenantFilter({ OR: [{ tenantEmpresa: 'a' }, { tenantEmpresa: 'b' }] })
    ).toBe(true)
    expect(hasTenantFilter({ OR: [{ id: 'a' }, { id: 'b' }] })).toBe(false)
  })
})
