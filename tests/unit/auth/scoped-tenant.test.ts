/**
 * Suite: getScopedTenantId — cierre del cross-tenant bypass.
 *
 * Verifica que ninguna ruta pueda usar un `x-tenant-id` distinto al de la
 * sesión a menos que el usuario sea SUPER_ADMIN.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock de `auth()` antes de importar los helpers (se hace dentro de `vi.mock`
// porque el módulo los resuelve al cargar).
const mockAuth = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}))

// Mock de next/navigation para que el `redirect` importado no rompa
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`)
  },
}))

import { getScopedTenantId, TenantMismatchError } from '@/lib/auth/session'

function mockSession(role: string, tenantId: string) {
  mockAuth.mockResolvedValue({
    user: { id: 'user-1', email: 'x@y.com', role, tenantId },
  })
}

function requestWith(headers: Record<string, string>): Request {
  return new Request('http://x', { headers })
}

describe('getScopedTenantId', () => {
  beforeEach(() => {
    mockAuth.mockReset()
  })

  it('devuelve el tenant de la sesión si no hay header', async () => {
    mockSession('ADMIN_EMPRESA', 'tenant-A')
    const result = await getScopedTenantId()
    expect(result).toBe('tenant-A')
  })

  it('devuelve el tenant de la sesión si el header coincide', async () => {
    mockSession('ADMIN_EMPRESA', 'tenant-A')
    const req = requestWith({ 'x-tenant-id': 'tenant-A' })
    const result = await getScopedTenantId(req)
    expect(result).toBe('tenant-A')
  })

  it('LANZA TenantMismatchError si el header difiere y el rol no es SUPER_ADMIN', async () => {
    mockSession('ADMIN_EMPRESA', 'tenant-A')
    const req = requestWith({ 'x-tenant-id': 'tenant-B' })
    await expect(getScopedTenantId(req)).rejects.toBeInstanceOf(TenantMismatchError)
  })

  it('permite override si el rol es SUPER_ADMIN (impersonación)', async () => {
    mockSession('SUPER_ADMIN', 'root-tenant')
    const req = requestWith({ 'x-tenant-id': 'tenant-B' })
    const result = await getScopedTenantId(req)
    expect(result).toBe('tenant-B')
  })

  it('RRHH de tenant A NO puede forzar tenant B via header', async () => {
    mockSession('RRHH', 'tenant-A')
    const req = requestWith({ 'x-tenant-id': 'tenant-B' })
    await expect(getScopedTenantId(req)).rejects.toThrow('Tenant mismatch')
  })

  it('AUDITOR (rol ROOT pero no SUPER_ADMIN) tampoco puede cross-tenant', async () => {
    mockSession('AUDITOR', 'tenant-A')
    const req = requestWith({ 'x-tenant-id': 'tenant-B' })
    await expect(getScopedTenantId(req)).rejects.toBeInstanceOf(TenantMismatchError)
  })
})

describe('TenantMismatchError', () => {
  it('expone status 403', () => {
    const err = new TenantMismatchError()
    expect(err.status).toBe(403)
    expect(err.name).toBe('TenantMismatchError')
  })
})
