import { AlertTriangle, ExternalLink, FileText, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCurrentDpaForTenant } from '@/lib/db/queries/admin-dpa'

/**
 * Tarjeta "Mi DPA vigente" para /empresa/configuracion y
 * /catering/configuracion. Se renderiza en servidor consultando el DPA
 * actualmente vigente.
 */
export async function MyDpaCard({ tenantId }: { tenantId: string }) {
  const dpa = await getCurrentDpaForTenant(tenantId)

  if (!dpa) {
    return (
      <Card className="border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-amber-900">
              <FileText className="h-4 w-4" />
              Mi DPA (Data Processing Agreement)
            </h3>
            <p className="mt-1 text-sm text-amber-800">
              Aún no hay un DPA vigente firmado con Plati. Contacta con
              tu responsable de cuenta para completar este requisito RGPD
              (Art. 28).
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const daysToExpire = dpa.effectiveTo
    ? Math.ceil(
        (dpa.effectiveTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null

  const expiringSoon = daysToExpire !== null && daysToExpire <= 30

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Mi DPA vigente (RGPD Art. 28)
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Versión <strong>{dpa.version}</strong> · firmado el{' '}
            {format(dpa.signedAt, "d 'de' MMMM yyyy", { locale: es })} por{' '}
            {dpa.signedByName}.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Vigente desde{' '}
            {format(dpa.effectiveFrom, 'dd MMM yyyy', { locale: es })}
            {dpa.effectiveTo &&
              ` hasta ${format(dpa.effectiveTo, 'dd MMM yyyy', { locale: es })}`}
            {expiringSoon && (
              <Badge variant="destructive" className="ml-2 text-[10px]">
                Caduca en {daysToExpire} días
              </Badge>
            )}
          </p>
        </div>
        <a
          href={dpa.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Descargar PDF
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </Card>
  )
}
