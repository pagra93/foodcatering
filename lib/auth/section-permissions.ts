/**
 * Mapa de enforcement por sección/portal: prefijo de ruta → permiso `:view`.
 *
 * El middleware usa esto para bloquear el acceso por URL directa a una sección
 * cuyo permiso no tiene el rol del usuario. Es la pareja del filtrado del
 * sidebar (que oculta lo que no se puede ver). Mantener en sincronía con
 * lib/auth/permission-catalog.ts y los sidebars.
 *
 * Reglas:
 * - Orden: del prefijo MÁS específico al más genérico (gana el primero que casa).
 * - Una ruta sin entrada aquí = acceso permitido (no se bloquea por defecto).
 */

type SectionRule = { prefix: string; permission: string; exact?: boolean }

export const ADMIN_SECTION_RULES: SectionRule[] = [
  // Usuarios y Roles (roles/permisos antes que /users genérico)
  { prefix: '/admin/users/roles', permission: 'role:view' },
  { prefix: '/admin/users', permission: 'user:view' },

  // Empresas / Caterings
  { prefix: '/admin/empresas', permission: 'empresa:view' },
  { prefix: '/admin/caterings', permission: 'catering:view' },

  // Catálogos (alérgenos y festivos)
  { prefix: '/admin/catalogs/allergens', permission: 'allergen:view' },
  { prefix: '/admin/catalogs/calendars', permission: 'calendar:view' },

  // Incidencias (sección propia; reasons antes que el prefijo genérico)
  { prefix: '/admin/incidents/reasons', permission: 'incident-reason:view' },
  { prefix: '/admin/incidents', permission: 'incident:view' },

  // Reputación (sección propia)
  { prefix: '/admin/reputation', permission: 'rating:view' },

  // Calidad y SLAs
  { prefix: '/admin/quality/audits', permission: 'audit:view' },
  { prefix: '/admin/quality/penalties', permission: 'penalty:view' },

  // Facturación y planes (reglas específicas antes de la raíz)
  { prefix: '/admin/billing/plans', permission: 'plan:view' },
  { prefix: '/admin/billing/settlements', permission: 'settlement:view' },
  { prefix: '/admin/billing/invoices', permission: 'admin-invoice:view' },
  { prefix: '/admin/billing/saas-invoices', permission: 'saas-invoice:view' },
  { prefix: '/admin/billing/commissions', permission: 'commission:view' },
  { prefix: '/admin/billing/estado-cuentas', permission: 'settlement:view' },
  { prefix: '/admin/billing/metrics', permission: 'metric:view' },
  { prefix: '/admin/billing/taxes', permission: 'tax:view' },
  // Índice del área (solo la raíz exacta): visible con permiso de liquidaciones.
  { prefix: '/admin/billing', permission: 'settlement:view', exact: true },

  // Integraciones
  { prefix: '/admin/integrations/webhooks', permission: 'webhook:view' },
  { prefix: '/admin/integrations/api-keys', permission: 'api-key:view' },
  { prefix: '/admin/integrations/erp', permission: 'integration:view' },
  { prefix: '/admin/integrations/sso', permission: 'integration:view' },
  { prefix: '/admin/integrations/payments', permission: 'integration:view' },

  // Compliance
  { prefix: '/admin/compliance/retention', permission: 'retention:view' },
  { prefix: '/admin/compliance/dpa', permission: 'dpa:view' },
  { prefix: '/admin/compliance/fiscal-audit', permission: 'fiscal-audit:view' },
  { prefix: '/admin/compliance/gdpr', permission: 'gdpr:view' },
  { prefix: '/admin/compliance/security', permission: 'security:view' },

  // Plantillas y branding
  { prefix: '/admin/templates/branding', permission: 'template-branding:view' },
  { prefix: '/admin/templates/communication', permission: 'template-communication:view' },
  { prefix: '/admin/templates/announcements', permission: 'announcement:view' },

  // Operación
  { prefix: '/admin/operations/impersonation', permission: 'impersonate:view' },
  { prefix: '/admin/operations/backups', permission: 'backup:view' },
  { prefix: '/admin/operations/migrations', permission: 'migration:view' },
  { prefix: '/admin/operations/maintenance', permission: 'maintenance:view' },
  { prefix: '/admin/operations/health', permission: 'health:view' },
  { prefix: '/admin/operations/rate-limiting', permission: 'rate-limit:view' },

  // Dashboard (exacto, debe ir al final por ser el prefijo más corto)
  { prefix: '/admin', permission: 'dashboard:view', exact: true },
]

export const EMPRESA_SECTION_RULES: SectionRule[] = [
  { prefix: '/empresa/configuracion/branding', permission: 'emp-config-branding:view' },
  { prefix: '/empresa/configuracion/holidays', permission: 'emp-config-holidays:view' },
  { prefix: '/empresa/configuracion/roles', permission: 'emp-config-role:view' },
  { prefix: '/empresa/configuracion/usuarios', permission: 'emp-config-user:view' },
  { prefix: '/empresa/configuracion', permission: 'emp-config:view' },
  { prefix: '/empresa/empleados', permission: 'employee:view' },
  { prefix: '/empresa/pedidos', permission: 'emp-order:view' },
  { prefix: '/empresa/catering', permission: 'emp-catering:view' },
  { prefix: '/empresa/facturacion', permission: 'emp-billing:view' },
  { prefix: '/empresa/incidencias', permission: 'emp-incident:view' },
  { prefix: '/empresa/auditoria', permission: 'emp-fiscal:view' },
  { prefix: '/empresa/actividad', permission: 'emp-activity:view' },
  { prefix: '/empresa/dashboard', permission: 'emp-dashboard:view' },
]

export const CATERING_SECTION_RULES: SectionRule[] = [
  // Las subsecciones de configuración se reglan; la landing /catering/configuracion
  // queda libre (solo enlaza a las subsecciones, que sí se controlan).
  { prefix: '/catering/configuracion/branding', permission: 'cat-config-branding:view' },
  { prefix: '/catering/configuracion/holidays', permission: 'cat-config-holidays:view' },
  { prefix: '/catering/configuracion/menu-templates', permission: 'cat-config-template:view' },
  { prefix: '/catering/configuracion/zones', permission: 'cat-config-zone:view' },
  { prefix: '/catering/configuracion/usuarios', permission: 'cat-config-user:view' },
  { prefix: '/catering/configuracion/roles', permission: 'cat-config-role:view' },
  { prefix: '/catering/platos', permission: 'dish:view' },
  { prefix: '/catering/menus', permission: 'menu:view' },
  { prefix: '/catering/produccion', permission: 'production:view' },
  { prefix: '/catering/rutas', permission: 'route:view' },
  { prefix: '/catering/ruta', permission: 'route:view' },
  { prefix: '/catering/empresas', permission: 'client-company:view' },
  { prefix: '/catering/incidencias', permission: 'cat-incident:view' },
  { prefix: '/catering/calidad', permission: 'quality:view' },
  { prefix: '/catering/facturacion', permission: 'cat-billing:view' },
  { prefix: '/catering/facturas', permission: 'invoice:view' },
  { prefix: '/catering/auditoria', permission: 'cat-audit:view' },
  { prefix: '/catering/dashboard', permission: 'cat-dashboard:view' },
]

export const EMPLEADO_SECTION_RULES: SectionRule[] = [
  { prefix: '/empleado/menus', permission: 'menu-select:view' },
  { prefix: '/empleado/perfil', permission: 'profile:view' },
  { prefix: '/empleado/historial', permission: 'history:view' },
  { prefix: '/empleado/incidencias', permission: 'emp-incident-own:view' },
]

/** Devuelve el set de reglas que aplica a una ruta (o null si ninguna). */
export function rulesForPath(pathname: string): SectionRule[] | null {
  if (pathname.startsWith('/admin')) return ADMIN_SECTION_RULES
  if (pathname.startsWith('/empresa')) return EMPRESA_SECTION_RULES
  if (pathname.startsWith('/catering')) return CATERING_SECTION_RULES
  if (pathname.startsWith('/empleado')) return EMPLEADO_SECTION_RULES
  return null
}

/** Permiso `:view` requerido para una ruta, o null si la ruta no está reglada. */
export function requiredPermissionForPath(
  rules: SectionRule[],
  pathname: string
): string | null {
  for (const rule of rules) {
    if (rule.exact) {
      if (pathname === rule.prefix) return rule.permission
      continue
    }
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.permission
    }
  }
  return null
}

/** ¿El set de permisos cubre `perm`? Soporta `*` y `recurso:*`. Edge-safe. */
export function permitted(permissions: string[], perm: string): boolean {
  if (permissions.includes('*')) return true
  if (permissions.includes(perm)) return true
  const resource = perm.split(':')[0]
  return permissions.includes(`${resource}:*`)
}
