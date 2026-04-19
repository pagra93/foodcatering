import { describe, it, expect } from 'vitest'
import type { UserRole } from '@prisma/client'
import {
  PERMISSIONS,
  ROLE_DESCRIPTIONS,
  PERMISSION_DESCRIPTIONS,
  ALL_PERMISSIONS,
  getRoleCategory,
  getPermissionState,
  rolesByTenantType,
  groupPermissionsByEntity,
} from '@/lib/auth/permissions'

describe('permissions metadata & helpers', () => {
  const allRoles = Object.keys(PERMISSIONS) as UserRole[]

  it('todos los roles tienen descripción humana', () => {
    for (const r of allRoles) {
      expect(ROLE_DESCRIPTIONS[r]).toBeTruthy()
    }
  })

  it('todos los permisos referenciados tienen descripción', () => {
    const missing: string[] = []
    for (const perm of ALL_PERMISSIONS) {
      if (!PERMISSION_DESCRIPTIONS[perm]) missing.push(perm)
    }
    expect(missing).toEqual([])
  })

  it('getRoleCategory clasifica correctamente', () => {
    expect(getRoleCategory('SUPER_ADMIN')).toBe('ROOT')
    expect(getRoleCategory('AUDITOR')).toBe('ROOT')
    expect(getRoleCategory('ADMIN_EMPRESA')).toBe('EMPRESA')
    expect(getRoleCategory('EMPLEADO')).toBe('EMPRESA')
    expect(getRoleCategory('CHEF')).toBe('CATERING')
    expect(getRoleCategory('REPARTIDOR')).toBe('CATERING')
  })

  it('rolesByTenantType devuelve el conjunto correcto', () => {
    expect(rolesByTenantType('ROOT')).toEqual(['SUPER_ADMIN', 'AUDITOR'])
    expect(rolesByTenantType('EMPRESA')).toContain('ADMIN_EMPRESA')
    expect(rolesByTenantType('EMPRESA')).toContain('EMPLEADO')
    expect(rolesByTenantType('EMPRESA').length).toBe(5)
    expect(rolesByTenantType('CATERING')).toContain('CHEF')
    expect(rolesByTenantType('CATERING').length).toBe(5)
  })

  it('getPermissionState detecta permiso directo, wildcard y denegado', () => {
    // SUPER_ADMIN tiene tenants:* → tenants:read debe ser wildcard
    expect(getPermissionState('SUPER_ADMIN', 'tenants:read')).toBe('wildcard')
    // AUDITOR tiene tenants:read directo (no wildcard)
    expect(getPermissionState('AUDITOR', 'tenants:read')).toBe('direct')
    // AUDITOR no tiene tenants:create ni directo ni por wildcard
    expect(getPermissionState('AUDITOR', 'tenants:create')).toBe('none')
    // EMPLEADO tiene orders:create directo
    expect(getPermissionState('EMPLEADO', 'orders:create')).toBe('direct')
    // EMPLEADO no tiene invoices:read de ninguna manera
    expect(getPermissionState('EMPLEADO', 'invoices:read')).toBe('none')
  })

  it('groupPermissionsByEntity agrupa por prefijo y ordena', () => {
    const groups = groupPermissionsByEntity([
      'orders:read',
      'invoices:*',
      'orders:create',
      'users:read',
    ])
    expect(groups['orders']).toEqual(['orders:create', 'orders:read'])
    expect(groups['invoices']).toEqual(['invoices:*'])
    expect(groups['users']).toEqual(['users:read'])
  })
})
