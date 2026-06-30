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

  // Catálogos globales
  { prefix: '/admin/catalogs/allergens', permission: 'allergen:view' },
  { prefix: '/admin/catalogs/menu-templates', permission: 'menu-template:view' },
  { prefix: '/admin/catalogs/calendars', permission: 'calendar:view' },
  { prefix: '/admin/catalogs/zones', permission: 'zone:view' },
  { prefix: '/admin/catalogs/incident-reasons', permission: 'incident-reason:view' },

  // Calidad y SLAs
  { prefix: '/admin/quality/audits', permission: 'audit:view' },
  { prefix: '/admin/quality/incidents', permission: 'incident:view' },
  { prefix: '/admin/quality/ratings', permission: 'rating:view' },
  { prefix: '/admin/quality/penalties', permission: 'penalty:view' },

  // Facturación y planes
  { prefix: '/admin/billing/plans', permission: 'plan:view' },
  { prefix: '/admin/billing/settlements', permission: 'settlement:view' },
  { prefix: '/admin/billing/commissions', permission: 'commission:view' },
  { prefix: '/admin/billing/metrics', permission: 'metric:view' },
  { prefix: '/admin/billing/taxes', permission: 'tax:view' },

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
