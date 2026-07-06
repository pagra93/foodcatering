/**
 * Suite: callback jwt — impersonación endurecida (C1).
 *
 * Verifica que el bypass de impersonación esté cerrado: el payload de
 * `useSession().update()` lo controla el cliente, así que el callback solo debe
 * honrar la impersonación cuando el token vigente ES SUPER_ADMIN, y siempre
 * derivando rol/tenant/permisos de la BD (nunca del payload del cliente).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

const findUnique = vi.fn()

// El callback usa `prisma` de '@/lib/db' y `resolveUserPermissions'.
vi.mock('@/lib/db', () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}))
vi.mock('@/lib/auth/resolve-permissions', () => ({
  resolveUserPermissions: vi.fn(async () => ['orders:read']),
}))

import { authConfig } from '@/lib/auth/config'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jwt = authConfig.callbacks!.jwt! as (arg: any) => Promise<any>

function baseToken(over: Record<string, unknown> = {}) {
  return {
    id: 'u',
    role: 'EMPLEADO',
    tenantId: 'tenant-A',
    email: 'u@x.com',
    name: 'U',
    ...over,
  }
}

function updateWith(targetOver: Record<string, unknown>) {
  return {
    impersonationToken: {
      targetUserId: 'target',
      targetRole: 'SUPER_ADMIN',
      targetTenantId: 'tenant-EVIL',
      originalUserId: 'forjado',
      originalRole: 'EMPLEADO',
      startedAt: 0,
      expiresAt: 9e12,
      ...targetOver,
    },
  }
}

describe('jwt callback — impersonación endurecida (C1)', () => {
  beforeEach(() => {
    findUnique.mockReset()
  })

  it('IGNORA la impersonación si el token vigente NO es SUPER_ADMIN (ni consulta la BD)', async () => {
    const token = baseToken({ id: 'emp-1', role: 'EMPLEADO', tenantId: 'tenant-A' })
    const session = updateWith({ targetUserId: 'super-1', targetRole: 'SUPER_ADMIN' })

    const result = await jwt({ token, trigger: 'update', session })

    expect(result.role).toBe('EMPLEADO')
    expect(result.tenantId).toBe('tenant-A')
    expect(result.id).toBe('emp-1')
    expect(result.impersonationToken).toBeUndefined()
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('un SUPER_ADMIN real impersona: rol/tenant salen de la BD, no del payload', async () => {
    findUnique.mockResolvedValue({
      id: 'emp-2',
      role: 'EMPLEADO',
      tenantId: 'tenant-B',
      roleId: 'role-emp',
      nameEnc: 'Empleado',
      email: 'e@e.com',
      deletedAt: null,
      tenant: { type: 'EMPRESA' },
    })
    const token = baseToken({ id: 'super-1', role: 'SUPER_ADMIN', tenantId: 'root' })
    const session = updateWith({
      targetUserId: 'emp-2',
      targetRole: 'SUPER_ADMIN', // el cliente miente; debe ignorarse
      targetTenantId: 'tenant-EVIL',
    })

    const result = await jwt({ token, trigger: 'update', session })

    expect(result.id).toBe('emp-2')
    expect(result.role).toBe('EMPLEADO') // de la BD, no 'SUPER_ADMIN'
    expect(result.tenantId).toBe('tenant-B') // de la BD, no 'tenant-EVIL'
    expect(result.impersonationToken.originalUserId).toBe('super-1') // identidad real, no 'forjado'
    expect(result.impersonationToken.targetRole).toBe('EMPLEADO')
  })

  it('NO permite impersonar a otro SUPER_ADMIN', async () => {
    findUnique.mockResolvedValue({
      id: 'super-2',
      role: 'SUPER_ADMIN',
      tenantId: 'root2',
      roleId: 'r',
      nameEnc: 'S',
      email: 's@s.com',
      deletedAt: null,
      tenant: { type: 'ROOT' },
    })
    const token = baseToken({ id: 'super-1', role: 'SUPER_ADMIN', tenantId: 'root' })
    const session = updateWith({ targetUserId: 'super-2' })

    const result = await jwt({ token, trigger: 'update', session })

    expect(result.id).toBe('super-1') // sin cambios
    expect(result.impersonationToken).toBeUndefined()
  })

  it('NO impersona a un usuario borrado', async () => {
    findUnique.mockResolvedValue({
      id: 'emp-3',
      role: 'EMPLEADO',
      tenantId: 'tenant-C',
      roleId: 'r',
      nameEnc: 'E',
      email: 'e3@e.com',
      deletedAt: new Date(),
      tenant: { type: 'EMPRESA' },
    })
    const token = baseToken({ id: 'super-1', role: 'SUPER_ADMIN', tenantId: 'root' })
    const session = updateWith({ targetUserId: 'emp-3', targetRole: 'EMPLEADO' })

    const result = await jwt({ token, trigger: 'update', session })

    expect(result.id).toBe('super-1') // sin cambios
    expect(result.impersonationToken).toBeUndefined()
  })
})
