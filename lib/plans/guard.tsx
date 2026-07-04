import {
  getCompanyEntitlements,
  companyHasFeature,
  getCateringEntitlements,
  cateringHasFeature,
} from '@/lib/plans/entitlements'
import { UpgradeLock } from '@/components/empresa/plan/UpgradeLock'
import { FEATURE_CATALOG } from '@/lib/plans/feature-catalog'

/**
 * Guard de feature para páginas del portal empresa. Si el plan de la empresa NO
 * incluye la feature, devuelve un nodo de bloqueo (UpgradeLock) para renderizar
 * en vez del contenido; si sí, devuelve null (el llamador pinta su contenido).
 *
 *   const locked = await requireCompanyFeature(tenantId, 'fiscal-audit')
 *   if (locked) return locked
 */
export async function requireCompanyFeature(
  tenantEmpresa: string,
  featureKey: string
): Promise<React.ReactNode | null> {
  const ent = await getCompanyEntitlements(tenantEmpresa)
  if (companyHasFeature(ent, featureKey)) return null

  const feature = FEATURE_CATALOG.find((f) => f.key === featureKey)
  return (
    <UpgradeLock
      title={feature?.label ?? 'Funcionalidad no incluida'}
      description={
        feature?.description
          ? `${feature.description} No está incluida en tu plan actual.`
          : undefined
      }
      planName={ent.planName}
    />
  )
}

/**
 * Guard de feature para páginas del portal CATERING (espejo del de empresa).
 *   const locked = await requireCateringFeature(tenantId, 'cat-production')
 *   if (locked) return locked
 */
export async function requireCateringFeature(
  tenantCatering: string,
  featureKey: string
): Promise<React.ReactNode | null> {
  const ent = await getCateringEntitlements(tenantCatering)
  if (cateringHasFeature(ent, featureKey)) return null

  const feature = FEATURE_CATALOG.find((f) => f.key === featureKey)
  return (
    <UpgradeLock
      title={feature?.label ?? 'Funcionalidad no incluida'}
      description={
        feature?.description
          ? `${feature.description} No está incluida en el plan de tu catering.`
          : undefined
      }
      planName={ent.planName}
      ctaHref="/catering/facturacion"
    />
  )
}
