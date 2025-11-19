/**
 * Sistema de permisos y autorización
 * Define qué roles pueden hacer qué acciones
 */

import type { UserRole, TenantType } from '@prisma/client'

/**
 * Mapa de permisos por rol
 */
export const PERMISSIONS = {
  // ROOT PERMISSIONS
  SUPER_ADMIN: [
    'tenants:*',
    'users:*',
    'audit_logs:read',
    'impersonate:*',
    'policies:*',
  ],
  AUDITOR: [
    'tenants:read',
    'users:read',
    'audit_logs:read',
    'orders:read',
    'invoices:read',
  ],

  // EMPRESA PERMISSIONS
  ADMIN_EMPRESA: [
    'employees:*',
    'company:*',
    'orders:read',
    'invoices:*',
    'exports:*',
    'incidents:*',
  ],
  RRHH: [
    'employees:create',
    'employees:read',
    'employees:update',
    'company:read',
    'company:update',
    'orders:read',
    'exports:read',
  ],
  FINANZAS: ['invoices:*', 'exports:*', 'orders:read', 'company:read'],
  MANAGER_SEDE: [
    'orders:read',
    'employees:read',
    'incidents:create',
    'incidents:read',
  ],
  EMPLEADO: [
    'orders:create',
    'orders:read:own',
    'orders:update:own',
    'orders:cancel:own',
    'incidents:create',
  ],

  // CATERING PERMISSIONS
  ADMIN_CATERING: [
    'dishes:*',
    'orders:read',
    'orders:deliver',
    'invoices:*',
    'restaurant:*',
  ],
  CHEF: [
    'dishes:*',
    'orders:read',
    'kitchen_sheets:read',
    'packing_sheets:read',
  ],
  COCINERO: ['kitchen_sheets:read', 'orders:read'],
  REPARTIDOR: [
    'packing_sheets:read',
    'orders:deliver',
    'delivery_events:create',
    'incidents:create',
  ],
  FINANZAS_CATERING: ['invoices:*', 'orders:read', 'restaurant:read'],
} as const

/**
 * Verificar si un rol tiene un permiso específico
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  const rolePermissions = PERMISSIONS[role] || []

  return rolePermissions.some((p) => {
    // Permiso exacto
    if (p === permission) return true

    // Wildcard (*) al final
    if (p.endsWith(':*')) {
      const prefix = p.slice(0, -2)
      return permission.startsWith(prefix)
    }

    return false
  })
}

/**
 * Verificar si un rol puede acceder a un tenant
 */
export function canAccessTenant(
  userTenantId: string,
  userRole: UserRole,
  targetTenantId: string
): boolean {
  // Super admin puede acceder a todo
  if (userRole === 'SUPER_ADMIN') {
    return true
  }

  // El resto solo puede acceder a su propio tenant
  return userTenantId === targetTenantId
}

/**
 * Verificar si un usuario puede impersonar
 */
export function canImpersonate(role: UserRole): boolean {
  return role === 'SUPER_ADMIN'
}

/**
 * Obtener el tipo de dashboard según el rol
 */
export function getDashboardPath(
  role: UserRole,
  tenantType: TenantType
): string {
  // Root admin
  if (role === 'SUPER_ADMIN' || role === 'AUDITOR') {
    return '/admin/dashboard'
  }

  // Empresa
  if (tenantType === 'EMPRESA') {
    if (role === 'EMPLEADO') {
      return '/dashboard' // Portal empleado
    }
    return '/empresa/dashboard' // RRHH, Finanzas, Manager
  }

  // Catering
  if (tenantType === 'CATERING') {
    return '/catering/dashboard'
  }

  // Fallback
  return '/dashboard'
}

/**
 * Verificar si un rol es de empresa
 */
export function isEmpresaRole(role: UserRole): boolean {
  return [
    'ADMIN_EMPRESA',
    'RRHH',
    'FINANZAS',
    'MANAGER_SEDE',
    'EMPLEADO',
  ].includes(role)
}

/**
 * Verificar si un rol es de catering
 */
export function isCateringRole(role: UserRole): boolean {
  return [
    'ADMIN_CATERING',
    'CHEF',
    'COCINERO',
    'REPARTIDOR',
    'FINANZAS_CATERING',
  ].includes(role)
}

/**
 * Verificar si un rol es root
 */
export function isRootRole(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'AUDITOR'].includes(role)
}

