/**
 * Catálogo de FEATURES de plan SaaS (fuente única, como `permission-catalog.ts`
 * lo es del RBAC). Un plan habilita un subconjunto de estas features; según el
 * plan de la empresa se activan/limitan funcionalidades del portal empresa.
 *
 * - Features `core: true` = base, incluidas SIEMPRE en todos los planes (no se
 *   pueden desactivar; el negocio no funciona sin ellas).
 * - El resto son features de pago que cada plan habilita o no.
 * - Los límites numéricos (cuotas) NO son features: viven en columnas del plan
 *   (`maxEmployees`/`maxSites`/`maxCaterings`) y se listan en LIMIT_DEFS.
 *
 * Todas las claves de feature mapean funcionalidad del portal empresa; el mapa
 * ruta→feature (para gating de secciones) vive en `lib/plans/section-features.ts`.
 */

export type FeatureCategory = { key: string; label: string }

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  { key: 'general', label: 'General' },
  { key: 'equipo', label: 'Equipo y accesos' },
  { key: 'operativa', label: 'Operativa diaria' },
  { key: 'calidad', label: 'Calidad y catering' },
  { key: 'fiscal', label: 'Fiscal y facturación' },
  { key: 'analitica', label: 'Analítica' },
  { key: 'personalizacion', label: 'Personalización e integraciones' },
]

export type FeatureEntry = {
  key: string
  label: string
  category: string
  description: string
  /** Base: incluida siempre en todos los planes (no desactivable). */
  core?: boolean
}

export const FEATURE_CATALOG: FeatureEntry[] = [
  // ── General ──────────────────────────────────────────────────────────────
  { key: 'dashboard', label: 'Dashboard', category: 'general', core: true, description: 'Panel de inicio con KPIs de la empresa.' },
  { key: 'activity-log', label: 'Registro de actividad', category: 'general', description: 'Historial de acciones y auditoría interna del portal.' },

  // ── Equipo y accesos ─────────────────────────────────────────────────────
  { key: 'employees', label: 'Gestión de empleados', category: 'equipo', core: true, description: 'Alta, baja y edición de empleados (sujeto a la cuota del plan).' },
  { key: 'user-management', label: 'Usuarios de gestión', category: 'equipo', description: 'Invitar y gestionar usuarios de gestión (RRHH, finanzas, managers).' },
  { key: 'roles-management', label: 'Roles y permisos', category: 'equipo', description: 'Crear roles a medida y asignar permisos dentro de la empresa.' },

  // ── Operativa diaria ─────────────────────────────────────────────────────
  { key: 'orders', label: 'Pedidos', category: 'operativa', core: true, description: 'Gestión y seguimiento de los pedidos de comida.' },
  { key: 'multi-site', label: 'Multi-sede', category: 'operativa', description: 'Gestionar varios centros/sedes de trabajo (ligado a la cuota de sedes).' },

  // ── Calidad y catering ───────────────────────────────────────────────────
  { key: 'catering', label: 'Catering asignado', category: 'calidad', core: true, description: 'Ver el catering asignado, menús y SLAs.' },
  { key: 'incidents', label: 'Incidencias', category: 'calidad', core: true, description: 'Reportar y seguir incidencias con el catering.' },
  { key: 'reputation', label: 'Reputación', category: 'calidad', description: 'Ver cómo valoran los empleados los platos del catering.' },

  // ── Fiscal y facturación ─────────────────────────────────────────────────
  { key: 'billing', label: 'Facturación', category: 'fiscal', core: true, description: 'Facturas de comida y cuota SaaS de la empresa.' },
  { key: 'fiscal-audit', label: 'Auditoría fiscal (IRPF)', category: 'fiscal', description: 'Informes de deducibilidad y cumplimiento IRPF (≤11€/día).' },

  // ── Analítica ────────────────────────────────────────────────────────────
  { key: 'advanced-analytics', label: 'Analítica avanzada', category: 'analitica', description: 'Reportes y dashboards avanzados (adopción, tendencias).' },
  { key: 'data-export', label: 'Exportación de datos', category: 'analitica', description: 'Exportar informes y datos a CSV/Excel.' },

  // ── Personalización e integraciones ──────────────────────────────────────
  { key: 'custom-branding', label: 'Branding propio', category: 'personalizacion', description: 'Personalizar logo y colores del portal de la empresa.' },
  { key: 'api-access', label: 'Acceso API', category: 'personalizacion', description: 'API e integraciones (SSO, ERP) para la empresa.' },
]

export const ALL_FEATURE_KEYS: string[] = FEATURE_CATALOG.map((f) => f.key)
export const CORE_FEATURE_KEYS: string[] = FEATURE_CATALOG.filter((f) => f.core).map((f) => f.key)

/** Expande `'*'` (todas) y filtra claves inexistentes. Espejo de resolveRolePermissionKeys. */
export function resolvePlanFeatureKeys(features: string[]): string[] {
  if (features.includes('*')) return [...ALL_FEATURE_KEYS]
  const valid = new Set(ALL_FEATURE_KEYS)
  return features.filter((k) => valid.has(k))
}

// ── Límites numéricos (cuotas) ───────────────────────────────────────────────
export type LimitKey = 'maxEmployees' | 'maxSites' | 'maxCaterings'

export const LIMIT_DEFS: { key: LimitKey; label: string; description: string }[] = [
  { key: 'maxEmployees', label: 'Máx. empleados', description: 'Empleados activos permitidos (vacío = ilimitado).' },
  { key: 'maxSites', label: 'Máx. sedes', description: 'Centros/sedes de trabajo (vacío = ilimitado).' },
  { key: 'maxCaterings', label: 'Máx. caterings', description: 'Caterings asignables a la vez (vacío = ilimitado).' },
]

// ── Planes de sistema (para el seed, espejo de SYSTEM_ROLES) ─────────────────
export type SystemPlanDef = {
  code: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number | null
  supportLevel: string
  limits: {
    maxEmployees: number | null
    maxSites: number | null
    maxCaterings: number | null
    maxOrdersMonth: number | null
  }
  /** Claves de feature habilitadas; `'*'` = todas. Las core se añaden solas. */
  features: string[]
}

export const SYSTEM_PLANS: SystemPlanDef[] = [
  {
    code: 'starter',
    name: 'Starter',
    description: 'Para equipos pequeños que empiezan con el beneficio de comida.',
    monthlyPrice: 49,
    yearlyPrice: 490,
    supportLevel: 'BASIC',
    limits: { maxEmployees: 20, maxSites: 1, maxCaterings: 1, maxOrdersMonth: 500 },
    features: [], // solo las core
  },
  {
    code: 'growth',
    name: 'Growth',
    description: 'Para empresas en crecimiento con varias sedes y necesidades fiscales.',
    monthlyPrice: 149,
    yearlyPrice: 1490,
    supportLevel: 'PRIORITY',
    limits: { maxEmployees: 100, maxSites: 5, maxCaterings: 3, maxOrdersMonth: 3000 },
    features: [
      'activity-log',
      'user-management',
      'multi-site',
      'reputation',
      'fiscal-audit',
      'advanced-analytics',
      'data-export',
    ],
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Todo incluido, sin límites, con soporte dedicado e integraciones.',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    supportLevel: 'DEDICATED',
    limits: { maxEmployees: null, maxSites: null, maxCaterings: null, maxOrdersMonth: null },
    features: ['*'],
  },
]
