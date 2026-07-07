import { describe, it, expect } from 'vitest'
import { computeOrderIntegrityHash, type OrderContent } from '@/lib/db/queries/order-history'

const base: OrderContent = {
  tenantEmpresa: 'emp-1',
  tenantCatering: 'cat-1',
  employeeId: 'e-1',
  siteId: 's-1',
  serviceDate: new Date('2026-07-07T00:00:00.000Z'),
  selection: { starterId: 'a', mainId: 'b', dessertId: 'c' },
  price: 10.5,
  menuType: 'FULL',
  status: 'CONFIRMED',
  version: 1,
}

describe('computeOrderIntegrityHash', () => {
  it('es un SHA-256 (64 hex) y no aleatorio', () => {
    const hash = computeOrderIntegrityHash(base)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('mismo contenido → mismo hash (determinista)', () => {
    expect(computeOrderIntegrityHash(base)).toBe(computeOrderIntegrityHash({ ...base }))
  })

  it('es estable ante el orden de las claves de la selección', () => {
    const reordered: OrderContent = {
      ...base,
      selection: { dessertId: 'c', mainId: 'b', starterId: 'a' },
    }
    expect(computeOrderIntegrityHash(reordered)).toBe(computeOrderIntegrityHash(base))
  })

  it('cambia si cambia el precio', () => {
    expect(computeOrderIntegrityHash({ ...base, price: 11 })).not.toBe(
      computeOrderIntegrityHash(base)
    )
  })

  it('cambia si cambia el estado', () => {
    expect(
      computeOrderIntegrityHash({ ...base, status: 'CANCELLED_BEFORE_CUTOFF' })
    ).not.toBe(computeOrderIntegrityHash(base))
  })

  it('cambia con la versión (cada versión tiene su hash)', () => {
    expect(computeOrderIntegrityHash({ ...base, version: 2 })).not.toBe(
      computeOrderIntegrityHash(base)
    )
  })

  it('trata el precio numérico y su string igual (Decimal-safe)', () => {
    expect(computeOrderIntegrityHash({ ...base, price: '10.5' })).toBe(
      computeOrderIntegrityHash({ ...base, price: 10.5 })
    )
  })
})
