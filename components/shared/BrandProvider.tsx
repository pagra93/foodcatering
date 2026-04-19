import type { ReactNode } from 'react'
import {
  buildBrandingStyle,
  getEffectiveBranding,
  type EffectiveBranding,
} from '@/lib/branding'

/**
 * Envuelve el layout de un portal con un div que expone las CSS vars
 * `--brand-primary` y `--brand-primary-foreground` para que los
 * componentes hijos puedan usarlas vía `bg-[var(--brand-primary)]` o
 * similar. También inyecta el favicon del tenant si está configurado.
 */
export async function BrandProvider({
  tenantId,
  children,
}: {
  tenantId: string | null | undefined
  children: ReactNode
}) {
  const branding = await getEffectiveBranding(tenantId)
  const style = buildBrandingStyle(branding) as React.CSSProperties

  return (
    <>
      {branding.faviconUrl && (
        <link rel="icon" href={branding.faviconUrl} sizes="any" />
      )}
      <div style={style} className="contents" data-brand-primary={branding.primaryColor}>
        {children}
      </div>
    </>
  )
}

/**
 * Versión que también devuelve el branding al consumidor (para pasarlo
 * como prop a componentes hijos que necesiten los valores, no sólo las
 * CSS vars).
 */
export async function withBranding(
  tenantId: string | null | undefined
): Promise<{ branding: EffectiveBranding; style: React.CSSProperties }> {
  const branding = await getEffectiveBranding(tenantId)
  return {
    branding,
    style: buildBrandingStyle(branding) as React.CSSProperties,
  }
}
