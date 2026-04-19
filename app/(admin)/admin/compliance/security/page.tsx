import Link from 'next/link'
import { ArrowLeft, CheckCircle, ExternalLink, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { SecurityCheckCategory } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getSecurityChecks,
  getSecurityKPIs,
  getSecurityReports,
  OWASP_CATEGORY_LABEL,
} from '@/lib/db/queries/admin-security'

const SEVERITY_COLOR: Record<string, string> = {
  INFO: 'bg-gray-100 text-gray-700',
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export default async function SecurityPage() {
  const [kpis, checks, reports] = await Promise.all([
    getSecurityKPIs(),
    getSecurityChecks(),
    getSecurityReports(10),
  ])

  const categories = Object.keys(
    OWASP_CATEGORY_LABEL
  ) as SecurityCheckCategory[]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/compliance">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Compliance
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Seguridad — OWASP + Pentest</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Checklist de los 10 controles OWASP Top 10 con evidencia documentada,
          e informes externos de pentesting. Útil para clientes que piden
          evidencia de seguridad en due diligence.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Verificados</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {kpis.verified}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Fallidos</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{kpis.failed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {kpis.pending}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Informes pentest</p>
          <p className="mt-1 text-2xl font-bold">{kpis.totalReports}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Hallazgos graves</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {kpis.criticalFindings}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-base font-semibold">Checklist OWASP Top 10</h3>
        <div className="space-y-3">
          {categories.map((cat) => {
            const categoryChecks = checks.filter((c) => c.category === cat)
            const total = categoryChecks.length
            const ok = categoryChecks.filter((c) => c.status === 'VERIFIED').length
            const failed = categoryChecks.filter((c) => c.status === 'FAILED').length

            return (
              <div
                key={cat}
                className="flex items-start justify-between gap-3 rounded-md border border-gray-100 p-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {OWASP_CATEGORY_LABEL[cat]}
                  </p>
                  {total === 0 ? (
                    <p className="mt-1 text-xs text-gray-400">
                      Sin ítems registrados — añade controles específicos.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {categoryChecks.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-start gap-2 text-xs text-gray-600"
                        >
                          {c.status === 'VERIFIED' && (
                            <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-600" />
                          )}
                          {c.status === 'FAILED' && (
                            <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-600" />
                          )}
                          {c.status === 'PENDING' && (
                            <span className="mt-0.5 inline-block h-3 w-3 flex-shrink-0 rounded-full border-2 border-amber-400" />
                          )}
                          <span>
                            {c.item}
                            {c.evidence && (
                              <span className="ml-2 text-gray-400">
                                · {c.evidence}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="text-right text-xs">
                  {total > 0 && (
                    <>
                      <Badge variant={failed > 0 ? 'destructive' : ok === total ? 'default' : 'outline'}>
                        {ok}/{total}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-4 border-t pt-3 text-xs text-gray-500">
          Formulario de alta/edición de ítems OWASP y upload de informes
          pentest: se añadirá como iteración incremental. La tabla ya muestra
          el estado cuando hay datos.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 text-base font-semibold">
          Informes de pentesting externos
        </h3>
        {reports.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aún no se han subido informes de pentest.
          </p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border border-gray-100 p-3 text-sm"
              >
                <div className="flex-1">
                  <p className="font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {r.scanner} ·{' '}
                    {format(r.scannedAt, 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[r.severity]}`}
                >
                  {r.severity}
                </span>
                <a
                  href={r.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  Ver PDF
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
