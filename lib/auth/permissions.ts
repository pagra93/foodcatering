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
    'audits:*',
    'penalties:*',
    'quality:*',
    'compliance:*',
    'retention:*',
    'gdpr:*',
    'dpa:*',
    'security:*',
    'billing:*',
    'settlements:*',
    'saas_invoices:*',
    'saas_plans:*',
    'tax_rules:*',
    'operations:*',
    'maintenance:*',
    'backups:*',
    'rate_limit:*',
    'health:read',
    'branding:*',
    'system_settings:*',
    'catalogs:*',
    'allergens:*',
    'holidays:*',
    'incident_reasons:*',
    'menu_templates:*',
    'delivery_zones:*',
  ],
  AUDITOR: [
    'tenants:read',
    'users:read',
    'audit_logs:read',
    'orders:read',
    'invoices:read',
    'audits:read',
    'penalties:read',
    'quality:read',
    'compliance:read',
    'retention:read',
    'gdpr:read',
    'dpa:read',
    'security:read',
    'billing:read',
    'settlements:read',
    'saas_invoices:read',
    'saas_plans:read',
    'tax_rules:read',
    'operations:read',
    'maintenance:read',
    'backups:read',
    'rate_limit:read',
    'health:read',
    'branding:read',
    'system_settings:read',
    'catalogs:read',
    'allergens:read',
    'holidays:read',
    'incident_reasons:read',
    'menu_templates:read',
    'delivery_zones:read',
  ],

  // EMPRESA PERMISSIONS
  ADMIN_EMPRESA: [
    'employees:*',
    'company:*',
    'orders:read',
    'invoices:*',
    'exports:*',
    'incidents:*',
    'quality:read',
    'dpa:read',
    'gdpr:read',
    'gdpr:create',
    'branding:read',
    'branding:update',
    'holidays:read',
    'holidays:update',
  ],
  RRHH: [
    'employees:create',
    'employees:read',
    'employees:update',
    'company:read',
    'company:update',
    'orders:read',
    'exports:read',
    'gdpr:read',
    'gdpr:create',
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
    'gdpr:create:own',
  ],

  // CATERING PERMISSIONS
  ADMIN_CATERING: [
    'dishes:*',
    'orders:read',
    'orders:deliver',
    'invoices:*',
    'restaurant:*',
    'audits:read',
    'penalties:read',
    'penalties:dispute',
    'quality:read',
    'dpa:read',
    'branding:read',
    'branding:update',
    'holidays:read',
    'holidays:update',
    'menu_templates:*',
    'delivery_zones:*',
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
    return '/admin'
  }

  // Empresa
  if (tenantType === 'EMPRESA') {
    if (role === 'EMPLEADO') {
      return '/empleado/menus' // ✅ Portal empleado
    }
    return '/empresa/dashboard' // RRHH, Finanzas, Manager
  }

  // Catering
  if (tenantType === 'CATERING') {
    return '/catering/dashboard'
  }

  // Fallback
  return '/admin'
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

/**
 * Verificar si un usuario tiene un rol específico
 * Útil para guards y validaciones
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}

// ─── METADATA PARA UIs DE GESTIÓN DE ROLES Y PERMISOS ──────────────────────

/**
 * Categoría de portal a la que pertenece un rol.
 * Determina dónde se gestiona y visualiza (Admin / Empresa / Catering).
 */
export type RoleCategory = 'ROOT' | 'EMPRESA' | 'CATERING'

export function getRoleCategory(role: UserRole): RoleCategory {
  if (isRootRole(role)) return 'ROOT'
  if (isCateringRole(role)) return 'CATERING'
  return 'EMPRESA'
}

/**
 * Roles disponibles para un tipo de tenant.
 * Útil en formularios donde el selector de rol depende del tenant destino.
 */
export function rolesByTenantType(tenantType: TenantType): UserRole[] {
  switch (tenantType) {
    case 'ROOT':
      return ['SUPER_ADMIN', 'AUDITOR']
    case 'EMPRESA':
      return ['ADMIN_EMPRESA', 'RRHH', 'FINANZAS', 'MANAGER_SEDE', 'EMPLEADO']
    case 'CATERING':
      return [
        'ADMIN_CATERING',
        'CHEF',
        'COCINERO',
        'REPARTIDOR',
        'FINANZAS_CATERING',
      ]
  }
}

/**
 * Descripción humana por rol. Se usa en tablas, tooltips y formularios para
 * que RRHH entienda qué significa cada rol sin memorizar la matriz técnica.
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  // ROOT
  SUPER_ADMIN:
    'Administrador total del sistema Plati. Acceso cross-tenant y herramientas operativas.',
  AUDITOR:
    'Auditor externo con acceso de solo lectura a todos los tenants. No puede modificar datos.',

  // EMPRESA
  ADMIN_EMPRESA:
    'Responsable del portal empresa. Gestiona usuarios, política, contratos y facturación.',
  RRHH: 'Equipo de Recursos Humanos. Gestiona empleados, invitaciones y preferencias dietéticas.',
  FINANZAS:
    'Contabilidad de la empresa. Acceso a facturación y reportes fiscales.',
  MANAGER_SEDE:
    'Responsable de una sede concreta. Ve sólo los empleados y pedidos de su sede.',
  EMPLEADO:
    'Usuario final que consume el beneficio. Elige menú semanal, valora y reporta incidencias.',

  // CATERING
  ADMIN_CATERING:
    'Responsable del portal catering. Gestiona platos, menús, rutas, facturación y equipo.',
  CHEF: 'Jefe de cocina. Publica menús semanales, gestiona platos y supervisa producción.',
  COCINERO:
    'Cocinero de línea. Acceso de solo lectura al Kitchen Display para preparación.',
  REPARTIDOR:
    'Personal de reparto. Ve su ruta del día, confirma entregas y reporta incidencias.',
  FINANZAS_CATERING:
    'Contabilidad del catering. Genera facturas mensuales y registra cobros.',
}

/**
 * Descripción humana por permiso. `'entidad:accion'` → texto legible.
 * Usado en matrices de permisos y tooltips.
 */
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  // Tenants
  'tenants:read': 'Ver tenants y su información básica',
  'tenants:create': 'Crear nuevos tenants (empresas o caterings)',
  'tenants:update': 'Modificar datos de tenants existentes',
  'tenants:delete': 'Eliminar o desactivar tenants',
  'tenants:*': 'Todo sobre tenants (leer, crear, modificar, eliminar)',

  // Users
  'users:read': 'Ver usuarios del sistema',
  'users:create': 'Crear nuevos usuarios',
  'users:update': 'Modificar usuarios existentes',
  'users:delete': 'Eliminar o suspender usuarios',
  'users:*': 'Todo sobre usuarios',

  // Employees
  'employees:read': 'Ver empleados de la empresa',
  'employees:create': 'Dar de alta nuevos empleados',
  'employees:update': 'Modificar datos de empleados',
  'employees:delete': 'Dar de baja empleados',
  'employees:*': 'Todo sobre empleados',

  // Company
  'company:read': 'Ver configuración e información de la empresa',
  'company:update': 'Modificar configuración de la empresa',
  'company:*': 'Todo sobre la empresa',

  // Orders
  'orders:read': 'Ver pedidos',
  'orders:create': 'Crear pedidos',
  'orders:update': 'Modificar pedidos',
  'orders:cancel': 'Cancelar pedidos',
  'orders:deliver': 'Marcar pedidos como entregados',
  'orders:read:own': 'Ver sólo los pedidos propios',
  'orders:update:own': 'Modificar sólo los pedidos propios',
  'orders:cancel:own': 'Cancelar sólo los pedidos propios',
  'orders:*': 'Todo sobre pedidos',

  // Invoices
  'invoices:read': 'Ver facturas',
  'invoices:create': 'Generar facturas',
  'invoices:update': 'Modificar facturas',
  'invoices:*': 'Todo sobre facturación',

  // Exports
  'exports:read': 'Descargar exportaciones generadas',
  'exports:create': 'Generar nuevas exportaciones (CSV, PDF)',
  'exports:*': 'Todo sobre exportaciones',

  // Incidents
  'incidents:read': 'Ver incidencias',
  'incidents:create': 'Reportar incidencias',
  'incidents:update': 'Gestionar y resolver incidencias',
  'incidents:*': 'Todo sobre incidencias',

  // Dishes
  'dishes:read': 'Ver catálogo de platos',
  'dishes:create': 'Crear platos',
  'dishes:update': 'Modificar platos',
  'dishes:delete': 'Eliminar platos',
  'dishes:*': 'Todo sobre platos',

  // Restaurant
  'restaurant:read': 'Ver datos del catering',
  'restaurant:update': 'Modificar configuración del catering',
  'restaurant:*': 'Todo sobre el catering',

  // Production sheets
  'kitchen_sheets:read': 'Ver hojas de cocina (Kitchen Display)',
  'packing_sheets:read': 'Ver hojas de empaquetado (Packing Display)',
  'delivery_events:create': 'Registrar eventos de entrega',

  // Audit
  'audit_logs:read': 'Ver logs de auditoría',

  // Impersonation
  'impersonate:*': 'Impersonar a otros usuarios (solo super admin)',

  // Policies
  'policies:*': 'Gestionar políticas globales de la plataforma',

  // Quality (Sprint 2)
  'audits:read': 'Ver auditorías externas (sanitarias, operativas, satisfacción)',
  'audits:create': 'Registrar una nueva auditoría externa',
  'audits:update': 'Modificar auditorías existentes',
  'audits:*': 'Gestión completa de auditorías',

  'penalties:read': 'Ver penalizaciones aplicadas al catering',
  'penalties:create': 'Crear nuevas penalizaciones',
  'penalties:apply': 'Aplicar una penalización en estado PENDING',
  'penalties:waive': 'Perdonar una penalización (WAIVED)',
  'penalties:dispute': 'Disputar una penalización (catering sólo)',
  'penalties:*': 'Gestión completa de penalizaciones',

  'quality:read': 'Ver dashboard e indicadores de calidad y SLAs',
  'quality:*': 'Gestión completa del módulo de calidad',

  // Compliance (Sprint 3)
  'compliance:read': 'Ver panel de compliance',
  'compliance:*': 'Gestión completa del módulo de compliance',

  'retention:read': 'Ver políticas de retención de datos',
  'retention:update': 'Modificar políticas de retención',
  'retention:execute': 'Ejecutar purgas manualmente',
  'retention:*': 'Gestión completa de retención',

  'gdpr:read': 'Ver solicitudes RGPD',
  'gdpr:create': 'Crear solicitudes RGPD (en nombre de terceros)',
  'gdpr:create:own': 'Crear solicitudes RGPD sobre uno mismo',
  'gdpr:resolve': 'Resolver solicitudes RGPD (anonimizar, generar dumps)',
  'gdpr:*': 'Gestión completa de solicitudes RGPD',

  'dpa:read': 'Ver Data Processing Agreements',
  'dpa:create': 'Subir nueva versión de DPA',
  'dpa:*': 'Gestión completa de DPAs',

  'security:read': 'Ver checklist OWASP e informes pentest',
  'security:update': 'Marcar ítems OWASP y subir informes',
  'security:*': 'Gestión completa de seguridad',

  // Billing (Sprint 4)
  'billing:read': 'Ver facturas y liquidaciones',
  'billing:*': 'Gestión completa del módulo de facturación',
  'settlements:read': 'Ver liquidaciones catering→Plati',
  'settlements:create': 'Crear/emitir liquidaciones',
  'settlements:mark_paid': 'Marcar liquidación como pagada',
  'settlements:*': 'Gestión completa de liquidaciones',
  'saas_invoices:read': 'Ver facturas SaaS Plati→empresa',
  'saas_invoices:create': 'Generar facturas SaaS',
  'saas_invoices:mark_paid': 'Marcar factura SaaS como pagada',
  'saas_invoices:*': 'Gestión completa de facturas SaaS',
  'saas_plans:read': 'Ver catálogo de planes SaaS',
  'saas_plans:update': 'Modificar precios y features de planes',
  'saas_plans:*': 'Gestión completa de planes',
  'tax_rules:read': 'Ver reglas fiscales',
  'tax_rules:update': 'Modificar tipos de IVA',
  'tax_rules:*': 'Gestión completa de reglas fiscales',

  // Operación (Sprint 5)
  'operations:read': 'Ver panel de operación',
  'operations:*': 'Acceso completo al panel de operación',
  'maintenance:read': 'Ver ventanas de mantenimiento',
  'maintenance:create': 'Programar ventanas de mantenimiento',
  'maintenance:*': 'Gestión completa de mantenimiento',
  'backups:read': 'Ver histórico de backups',
  'backups:create': 'Registrar manualmente un backup',
  'backups:*': 'Gestión completa de backups',
  'rate_limit:read': 'Ver estado de rate limiters',
  'rate_limit:reset': 'Resetear rate limiters manualmente',
  'rate_limit:*': 'Gestión completa de rate limiting',
  'health:read': 'Consultar health checks',

  // Branding (Sprint 7)
  'branding:read': 'Ver branding del tenant propio',
  'branding:update': 'Modificar branding del tenant propio',
  'branding:*': 'Gestión total del branding (propio y de otros tenants)',
  'system_settings:read': 'Ver configuración global del sistema',
  'system_settings:update': 'Modificar defaults globales',
  'system_settings:*': 'Gestión completa de configuración global',

  // Catálogos (Sprint 8)
  'catalogs:read': 'Ver catálogos globales',
  'catalogs:*': 'Gestión completa de catálogos',
  'allergens:read': 'Ver catálogo de alérgenos',
  'allergens:update': 'Modificar alérgenos',
  'allergens:*': 'Gestión completa de alérgenos',
  'holidays:read': 'Ver calendario de festivos',
  'holidays:update': 'Adoptar o personalizar festivos del tenant',
  'holidays:*': 'Gestión completa de festivos (incluye oficiales)',
  'incident_reasons:read': 'Ver motivos de incidencia',
  'incident_reasons:update': 'Modificar motivos de incidencia',
  'incident_reasons:*': 'Gestión completa de motivos',
  'menu_templates:read': 'Ver plantillas de menú',
  'menu_templates:*': 'Gestión completa de plantillas',
  'delivery_zones:read': 'Ver zonas de reparto',
  'delivery_zones:*': 'Gestión completa de zonas',
}

/**
 * Catálogo completo de permisos existentes en el sistema, deducido de
 * PERMISSIONS (resolviendo wildcards a permisos concretos).
 * Útil para construir la matriz permisos × roles.
 */
export const ALL_PERMISSIONS: string[] = Array.from(
  new Set(
    Object.values(PERMISSIONS).flatMap((perms) => perms as readonly string[])
  )
).sort()

/**
 * Estado de un permiso para un rol: directo, heredado por wildcard, o no tiene.
 * Lo consume la matriz visual en /admin/users/permissions.
 */
export type PermissionState = 'direct' | 'wildcard' | 'none'

export function getPermissionState(
  role: UserRole,
  permission: string
): PermissionState {
  const rolePermissions = PERMISSIONS[role] || []
  for (const p of rolePermissions) {
    if (p === permission) return 'direct'
    if (p.endsWith(':*') && permission.startsWith(p.slice(0, -2))) {
      return 'wildcard'
    }
  }
  return 'none'
}

/**
 * Agrupa permisos por "entidad" (prefijo antes del `:`). Útil para la
 * matriz: mostrar todos los permisos de `orders:*` juntos, los de
 * `invoices:*` juntos, etc.
 */
export function groupPermissionsByEntity(
  permissions: string[]
): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const p of permissions) {
    const entity = p.split(':')[0] ?? 'other'
    const bucket = groups[entity] ?? (groups[entity] = [])
    bucket.push(p)
  }
  for (const key of Object.keys(groups)) {
    groups[key]?.sort()
  }
  return groups
}

