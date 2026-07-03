/**
 * Mapa prefijo-de-ruta → feature de plan requerida (portal empresa). Pareja de
 * `section-permissions.ts` pero para el gating por PLAN (no por rol). Lo usan el
 * sidebar (candado + CTA) y los guards de página (`requireCompanyFeature`).
 *
 * Solo se listan las secciones de PAGO. Las `core` (dashboard, empleados,
 * pedidos, catering, facturación, incidencias) no se listan → nunca se bloquean.
 */

type FeatureRule = { prefix: string; feature: string }

export const EMPRESA_FEATURE_RULES: FeatureRule[] = [
  { prefix: '/empresa/auditoria', feature: 'fiscal-audit' },
  { prefix: '/empresa/actividad', feature: 'activity-log' },
  { prefix: '/empresa/configuracion/branding', feature: 'custom-branding' },
  { prefix: '/empresa/configuracion/roles', feature: 'roles-management' },
  { prefix: '/empresa/configuracion/usuarios', feature: 'user-management' },
]

/** Feature requerida por una ruta empresa, o null si la ruta no está gated. */
export function requiredFeatureForPath(pathname: string): string | null {
  for (const rule of EMPRESA_FEATURE_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.feature
    }
  }
  return null
}
