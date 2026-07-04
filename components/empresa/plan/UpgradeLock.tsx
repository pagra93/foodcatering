import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Bloqueo de una funcionalidad no incluida en el plan de la empresa, con CTA de
 * mejora. Se renderiza en el guard de página (`requireCompanyFeature`) cuando la
 * empresa no tiene la feature.
 */
export function UpgradeLock({
  title,
  description,
  planName,
  ctaHref = '/empresa/facturacion',
}: {
  title: string
  description?: string
  planName?: string | null
  ctaHref?: string
}) {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
        <Lock className="h-6 w-6 text-amber-600" />
      </div>
      <h2 className="mt-4 text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">
        {description ??
          'Esta funcionalidad no está incluida en tu plan actual.'}
        {planName ? ` (Plan ${planName}).` : ''}
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button asChild>
          <Link href={ctaHref}>
            <Sparkles className="mr-2 h-4 w-4" />
            Ver planes y mejorar
          </Link>
        </Button>
      </div>
    </Card>
  )
}
