/**
 * Suite: RBAC
 *
 * Protege la matriz de permisos frente a regresiones. Si un día alguien añade
 * un rol o un permiso sin intención, estos tests lo cazan.
 */

import { describe, expect, it } from 'vitest'
import { hasPermission, canAccessTenant } from '@/lib/auth/permissions'

describe('hasPermission', () => {
  describe('matches exactos', () => {
    it('RRHH puede leer empleados', () => {
      expect(hasPermission('RRHH', 'employees:read')).toBe(true)
    })

    it('EMPLEADO puede crear pedidos', () => {
      expect(hasPermission('EMPLEADO', 'orders:create')).toBe(true)
    })

    it('REPARTIDOR puede marcar entregas', () => {
      expect(hasPermission('REPARTIDOR', 'orders:deliver')).toBe(true)
    })
  })

  describe('wildcards', () => {
    it('SUPER_ADMIN con tenants:* cubre tenants:read', () => {
      expect(hasPermission('SUPER_ADMIN', 'tenants:read')).toBe(true)
    })

    it('SUPER_ADMIN con tenants:* cubre tenants:delete', () => {
      expect(hasPermission('SUPER_ADMIN', 'tenants:delete')).toBe(true)
    })

    it('ADMIN_EMPRESA con employees:* cubre employees:create, read, update, delete', () => {
      for (const action of ['create', 'read', 'update', 'delete', 'invite']) {
        expect(hasPermission('ADMIN_EMPRESA', `employees:${action}`)).toBe(true)
      }
    })

    it('CHEF con dishes:* cubre dishes:create', () => {
      expect(hasPermission('CHEF', 'dishes:create')).toBe(true)
    })
  })

  describe('negativos', () => {
    it('EMPLEADO no puede gestionar empleados', () => {
      expect(hasPermission('EMPLEADO', 'employees:create')).toBe(false)
      expect(hasPermission('EMPLEADO', 'employees:delete')).toBe(false)
    })

    it('COCINERO no puede facturar', () => {
      expect(hasPermission('COCINERO', 'invoices:read')).toBe(false)
      expect(hasPermission('COCINERO', 'invoices:create')).toBe(false)
    })

    it('REPARTIDOR no puede modificar platos', () => {
      expect(hasPermission('REPARTIDOR', 'dishes:update')).toBe(false)
    })

    it('AUDITOR no puede impersonar', () => {
      expect(hasPermission('AUDITOR', 'impersonate:start')).toBe(false)
    })

    it('RRHH no tiene acceso total a empleados (solo create/read/update)', () => {
      // RRHH tiene 'employees:create', 'read', 'update' — NO 'delete' ni wildcard
      expect(hasPermission('RRHH', 'employees:delete')).toBe(false)
    })
  })

  describe('pseudo-wildcard exacto', () => {
    it('un permiso que termina en :* actúa como prefijo literal', () => {
      // CHEF con 'dishes:*' no debe cubrir 'dish:create' (sin s)
      expect(hasPermission('CHEF', 'dish:create')).toBe(false)
    })
  })
})

describe('canAccessTenant', () => {
  it('SUPER_ADMIN accede a cualquier tenant', () => {
    expect(canAccessTenant('tenant-A', 'SUPER_ADMIN', 'tenant-B')).toBe(true)
  })

  it('un ADMIN_EMPRESA sólo puede acceder a su propio tenant', () => {
    expect(canAccessTenant('tenant-A', 'ADMIN_EMPRESA', 'tenant-A')).toBe(true)
    expect(canAccessTenant('tenant-A', 'ADMIN_EMPRESA', 'tenant-B')).toBe(false)
  })

  it('AUDITOR NO es super admin para el bypass (pese a ser rol ROOT en algunos sitios)', () => {
    // AUDITOR es rol ROOT en el enum, pero `canAccessTenant` solo bypasea con SUPER_ADMIN
    expect(canAccessTenant('tenant-A', 'AUDITOR', 'tenant-B')).toBe(false)
  })

  it('un EMPLEADO tampoco puede cruzar tenants', () => {
    expect(canAccessTenant('tenant-A', 'EMPLEADO', 'tenant-B')).toBe(false)
  })
})
