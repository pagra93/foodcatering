/**
 * Catálogo de FEATURES de plan SaaS (fuente única, como `permission-catalog.ts`
 * lo es del RBAC). Un plan habilita un subconjunto de estas features; según el
 * plan de la empresa/catering se activan/limitan funcionalidades del portal.
 *
 * Los planes son TIPADOS: `EMPRESA` (portal empresa) o `CATERING` (portal
 * catering). Cada feature pertenece a un portal (`portal`) y las claves de
 * catering van namespaced (`cat-*`) para no colisionar con las de empresa.
 *
 * - Features `core: true` = base, incluidas SIEMPRE en todos los planes de su
 *   portal (no se pueden desactivar).
 * - Límites numéricos (cuotas) NO son features: viven en columnas del plan.
 */

export type PlanPortal = 'EMPRESA' | 'CATERING'

export type FeatureCategory = { key: string; label: string; portal: PlanPortal }

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  // Empresa
  { key: 'general', label: 'General', portal: 'EMPRESA' },
  { key: 'equipo', label: 'Equipo y accesos', portal: 'EMPRESA' },
  { key: 'operativa', label: 'Operativa diaria', portal: 'EMPRESA' },
  { key: 'calidad', label: 'Calidad y catering', portal: 'EMPRESA' },
  { key: 'fiscal', label: 'Fiscal y facturación', portal: 'EMPRESA' },
  { key: 'analitica', label: 'Analítica', portal: 'EMPRESA' },
  { key: 'personalizacion', label: 'Personalización e integraciones', portal: 'EMPRESA' },
  // Catering
  { key: 'cat-general', label: 'General', portal: 'CATERING' },
  { key: 'cat-operativa', label: 'Cocina y operativa', portal: 'CATERING' },
  { key: 'cat-clientes', label: 'Clientes e incidencias', portal: 'CATERING' },
  { key: 'cat-calidad', label: 'Calidad y reputación', portal: 'CATERING' },
  { key: 'cat-fiscal', label: 'Facturación', portal: 'CATERING' },
  { key: 'cat-analitica', label: 'Analítica', portal: 'CATERING' },
  { key: 'cat-personalizacion', label: 'Personalización e integraciones', portal: 'CATERING' },
]

export type FeatureEntry = {
  key: string
  label: string
  category: string
  description: string
  portal: PlanPortal
  /** Base: incluida siempre en todos los planes de su portal (no desactivable). */
  core?: boolean
}

const EMPRESA_FEATURES: Omit<FeatureEntry, 'portal'>[] = [
  { key: 'dashboard', label: 'Dashboard', category: 'general', core: true, description: 'Panel de inicio con KPIs de la empresa.' },
  { key: 'activity-log', label: 'Registro de actividad', category: 'general', description: 'Historial de acciones y auditoría interna del portal.' },
  { key: 'employees', label: 'Gestión de empleados', category: 'equipo', core: true, description: 'Alta, baja y edición de empleados (sujeto a la cuota del plan).' },
  { key: 'user-management', label: 'Usuarios de gestión', category: 'equipo', description: 'Invitar y gestionar usuarios de gestión (RRHH, finanzas, managers).' },
  { key: 'roles-management', label: 'Roles y permisos', category: 'equipo', description: 'Crear roles a medida y asignar permisos dentro de la empresa.' },
  { key: 'orders', label: 'Pedidos', category: 'operativa', core: true, description: 'Gestión y seguimiento de los pedidos de comida.' },
  { key: 'multi-site', label: 'Multi-sede', category: 'operativa', description: 'Gestionar varios centros/sedes de trabajo (ligado a la cuota de sedes).' },
  { key: 'catering', label: 'Catering asignado', category: 'calidad', core: true, description: 'Ver el catering asignado, menús y SLAs.' },
  { key: 'incidents', label: 'Incidencias', category: 'calidad', core: true, description: 'Reportar y seguir incidencias con el catering.' },
  { key: 'reputation', label: 'Reputación', category: 'calidad', description: 'Ver cómo valoran los empleados los platos del catering.' },
  { key: 'billing', label: 'Facturación', category: 'fiscal', core: true, description: 'Facturas de comida y cuota SaaS de la empresa.' },
  { key: 'fiscal-audit', label: 'Auditoría fiscal (IRPF)', category: 'fiscal', description: 'Informes de deducibilidad y cumplimiento IRPF (≤11€/día).' },
  { key: 'advanced-analytics', label: 'Analítica avanzada', category: 'analitica', description: 'Reportes y dashboards avanzados (adopción, tendencias).' },
  { key: 'data-export', label: 'Exportación de datos', category: 'analitica', description: 'Exportar informes y datos a CSV/Excel.' },
  { key: 'custom-branding', label: 'Branding propio', category: 'personalizacion', description: 'Personalizar logo y colores del portal de la empresa.' },
  { key: 'api-access', label: 'Acceso API', category: 'personalizacion', description: 'API e integraciones (SSO, ERP) para la empresa.' },
]

const CATERING_FEATURES: Omit<FeatureEntry, 'portal'>[] = [
  { key: 'cat-dashboard', label: 'Dashboard', category: 'cat-general', core: true, description: 'Panel de inicio con KPIs del catering.' },
  { key: 'cat-dishes', label: 'Platos', category: 'cat-operativa', core: true, description: 'Catálogo de platos del catering.' },
  { key: 'cat-menus', label: 'Menús semanales', category: 'cat-operativa', core: true, description: 'Planificación de menús semanales.' },
  { key: 'cat-production', label: 'Producción (KDS)', category: 'cat-operativa', description: 'Pantalla de cocina/producción y empaquetado.' },
  { key: 'cat-routes', label: 'Repartos (rutas)', category: 'cat-operativa', description: 'Gestión de rutas de reparto y entregas.' },
  { key: 'cat-companies', label: 'Empresas cliente', category: 'cat-clientes', core: true, description: 'Ver las empresas a las que sirve el catering.' },
  { key: 'cat-incidents', label: 'Incidencias', category: 'cat-clientes', core: true, description: 'Gestionar y resolver incidencias de las empresas.' },
  { key: 'cat-quality', label: 'Calidad y reputación', category: 'cat-calidad', description: 'Auditorías recibidas, penalizaciones y reputación por plato.' },
  { key: 'cat-billing', label: 'Facturación', category: 'cat-fiscal', core: true, description: 'Facturas a empresas y liquidaciones con Plati.' },
  { key: 'cat-analytics', label: 'Analítica avanzada', category: 'cat-analitica', description: 'Reportes y dashboards avanzados del catering.' },
  { key: 'cat-branding', label: 'Branding propio', category: 'cat-personalizacion', description: 'Personalizar logo y colores del portal del catering.' },
  { key: 'cat-api', label: 'Acceso API', category: 'cat-personalizacion', description: 'API e integraciones (ERP) para el catering.' },
]

export const FEATURE_CATALOG: FeatureEntry[] = [
  ...EMPRESA_FEATURES.map((f) => ({ ...f, portal: 'EMPRESA' as const })),
  ...CATERING_FEATURES.map((f) => ({ ...f, portal: 'CATERING' as const })),
]

export const ALL_FEATURE_KEYS: string[] = FEATURE_CATALOG.map((f) => f.key)
export const CORE_FEATURE_KEYS: string[] = FEATURE_CATALOG.filter((f) => f.core).map((f) => f.key)

export const EMPRESA_CORE_KEYS: string[] = FEATURE_CATALOG.filter((f) => f.core && f.portal === 'EMPRESA').map((f) => f.key)
export const CATERING_CORE_KEYS: string[] = FEATURE_CATALOG.filter((f) => f.core && f.portal === 'CATERING').map((f) => f.key)

/** Features (o keys) de un portal. */
export function featuresForPortal(portal: PlanPortal): FeatureEntry[] {
  return FEATURE_CATALOG.filter((f) => f.portal === portal)
}
export function keysForPortal(portal: PlanPortal): string[] {
  return featuresForPortal(portal).map((f) => f.key)
}
export function coreKeysForPortal(portal: PlanPortal): string[] {
  return portal === 'EMPRESA' ? EMPRESA_CORE_KEYS : CATERING_CORE_KEYS
}

/** Expande `'*'` (todas las de su portal) y filtra claves inexistentes. */
export function resolvePlanFeatureKeys(features: string[], portal: PlanPortal = 'EMPRESA'): string[] {
  const portalKeys = keysForPortal(portal)
  if (features.includes('*')) return [...portalKeys]
  const valid = new Set(portalKeys)
  return features.filter((k) => valid.has(k))
}

// ── Límites numéricos (cuotas) ───────────────────────────────────────────────
export type LimitKey = 'maxEmployees' | 'maxSites' | 'maxCaterings' | 'maxCompanies'

export const LIMIT_DEFS: { key: LimitKey; label: string; description: string; portal: PlanPortal }[] = [
  { key: 'maxEmployees', label: 'Máx. empleados', description: 'Empleados activos permitidos (vacío = ilimitado).', portal: 'EMPRESA' },
  { key: 'maxSites', label: 'Máx. sedes', description: 'Centros/sedes de trabajo (vacío = ilimitado).', portal: 'EMPRESA' },
  { key: 'maxCaterings', label: 'Máx. caterings', description: 'Caterings asignables a la vez (vacío = ilimitado).', portal: 'EMPRESA' },
  { key: 'maxCompanies', label: 'Máx. empresas', description: 'Empresas que el catering puede servir (vacío = ilimitado).', portal: 'CATERING' },
]

// ── Planes de sistema (para el seed, espejo de SYSTEM_ROLES) ─────────────────
export type SystemPlanDef = {
  code: string
  name: string
  description: string
  planType: PlanPortal
  supportLevel: string
  /** Claves de feature habilitadas; `'*'` = todas las de su portal. Las core se añaden solas. */
  features: string[]
  // Campos de EMPRESA
  monthlyPrice?: number
  yearlyPrice?: number | null
  limits?: {
    maxEmployees: number | null
    maxSites: number | null
    maxCaterings: number | null
    maxOrdersMonth: number | null
  }
  // Campos de CATERING
  pricing?: {
    model: 'COMMISSION' | 'FIXED'
    commissionPct?: number | null // 0.05 = 5%
    flatMonthlyFee?: number | null // €/mes
  }
  maxCompanies?: number | null
}

export const SYSTEM_PLANS: SystemPlanDef[] = [
  // ── EMPRESA ────────────────────────────────────────────────────────────────
  {
    code: 'starter',
    name: 'Starter',
    description: 'Para equipos pequeños que empiezan con el beneficio de comida.',
    planType: 'EMPRESA',
    monthlyPrice: 49,
    yearlyPrice: 490,
    supportLevel: 'BASIC',
    limits: { maxEmployees: 20, maxSites: 1, maxCaterings: 1, maxOrdersMonth: 500 },
    features: [],
  },
  {
    code: 'growth',
    name: 'Growth',
    description: 'Para empresas en crecimiento con varias sedes y necesidades fiscales.',
    planType: 'EMPRESA',
    monthlyPrice: 149,
    yearlyPrice: 1490,
    supportLevel: 'PRIORITY',
    limits: { maxEmployees: 100, maxSites: 5, maxCaterings: 3, maxOrdersMonth: 3000 },
    features: ['activity-log', 'user-management', 'multi-site', 'reputation', 'fiscal-audit', 'advanced-analytics', 'data-export'],
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Todo incluido, sin límites, con soporte dedicado e integraciones.',
    planType: 'EMPRESA',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    supportLevel: 'DEDICATED',
    limits: { maxEmployees: null, maxSites: null, maxCaterings: null, maxOrdersMonth: null },
    features: ['*'],
  },
  // ── CATERING ─────────────────────────────────────────────────────────────────
  {
    code: 'cat-basico',
    name: 'Catering Básico',
    description: 'Para caterings que empiezan: comisión estándar, hasta 3 empresas.',
    planType: 'CATERING',
    supportLevel: 'BASIC',
    pricing: { model: 'COMMISSION', commissionPct: 0.08 },
    maxCompanies: 3,
    features: [],
  },
  {
    code: 'cat-estandar',
    name: 'Catering Estándar',
    description: 'Comisión del 5% (la de hoy), producción, rutas y calidad, hasta 10 empresas.',
    planType: 'CATERING',
    supportLevel: 'PRIORITY',
    pricing: { model: 'COMMISSION', commissionPct: 0.05 },
    maxCompanies: 10,
    features: ['cat-production', 'cat-routes', 'cat-quality'],
  },
  {
    code: 'cat-premium',
    name: 'Catering Premium',
    description: 'Comisión reducida del 3%, sin límite de empresas, todo incluido.',
    planType: 'CATERING',
    supportLevel: 'DEDICATED',
    pricing: { model: 'COMMISSION', commissionPct: 0.03 },
    maxCompanies: null,
    features: ['*'],
  },
  {
    code: 'cat-cuota-fija',
    name: 'Catering Cuota Fija',
    description: 'Precio fijo mensual (sin comisión sobre facturación), todo incluido.',
    planType: 'CATERING',
    supportLevel: 'DEDICATED',
    pricing: { model: 'FIXED', flatMonthlyFee: 299 },
    maxCompanies: null,
    features: ['cat-production', 'cat-routes', 'cat-quality', 'cat-analytics'],
  },
]
