import { describe, it, expect } from 'vitest'
import { hasTenantFilter, isBoundedLookup } from '@/lib/db/prisma'

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

describe('isBoundedLookup (exenciones del guard)', () => {
  it('exime lookups acotados por id, employeeId o token', () => {
    expect(isBoundedLookup({ id: 'x' })).toBe(true)
    expect(isBoundedLookup({ id: { in: ['a', 'b'] } })).toBe(true)
    expect(isBoundedLookup({ employeeId: 'e1' })).toBe(true)
    expect(isBoundedLookup({ token: 'secreto' })).toBe(true)
  })

  it('NO exime otros FKs ni atributos', () => {
    expect(isBoundedLookup({ companyId: 'c1' })).toBe(false)
    expect(isBoundedLookup({ userId: 'u1' })).toBe(false)
    expect(isBoundedLookup({ email: 'a@b.c' })).toBe(false)
    expect(isBoundedLookup({ status: 'ACTIVE' })).toBe(false)
    expect(isBoundedLookup({})).toBe(false)
    expect(isBoundedLookup(undefined)).toBe(false)
  })
})

/**
 * Regresión de la Fase A (P0-1): shapes REALES de queries de portal que el
 * guard bloqueaba en producción. Si alguien "simplifica" estas queries quitando
 * la clave de tenant, estos tests documentan por qué no puede.
 */
describe('regresión: shapes reales de queries de portal', () => {
  const blockedByGuard = (where: unknown) =>
    !hasTenantFilter(where) && !isBoundedLookup(where)

  it('assignments del flujo de pedido llevan tenantEmpresa (empleado-menus)', () => {
    // Forma corregida: pasa el guard.
    expect(
      blockedByGuard({ tenantEmpresa: 't1', companyId: 'c1', active: true })
    ).toBe(false)
    // Forma antigua (solo companyId): el guard la bloqueaba → crear pedido = 500.
    expect(blockedByGuard({ companyId: 'c1', active: true })).toBe(true)
  })

  it('el catering PRIMARY de facturación lleva tenantEmpresa (empresa-facturacion)', () => {
    expect(
      blockedByGuard({
        tenantEmpresa: 't1',
        companyId: 't1',
        active: true,
        type: 'PRIMARY',
      })
    ).toBe(false)
  })

  it('el lookup por email de forgot-password NO pasa el guard → debe usar prismaAdmin', () => {
    // Cross-tenant por diseño (aún no hay sesión): con el cliente guardado
    // lanzaría; por eso la ruta usa prismaAdmin, igual que el login.
    expect(
      blockedByGuard({ email: 'a@b.c', status: 'ACTIVE', deletedAt: null })
    ).toBe(true)
  })
})
