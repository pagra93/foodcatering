import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AuditType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db/prisma'
import {
  getAuditsKPIs,
  getRestaurantAudits,
} from '@/lib/db/queries/admin-audits'
import { NewAuditForm } from '@/components/admin/quality/audits/NewAuditForm'

const TYPE_LABEL: Record<AuditType, string> = {
  SANITARIA: 'Sanitaria',
  OPERATIVA: 'Operativa',
  SATISFACCION: 'Satisfacción',
}

const TYPE_COLOR: Record<AuditType, string> = {
  SANITARIA: 'bg-red-100 text-red-700 border-red-200',
  OPERATIVA: 'bg-blue-100 text-blue-700 border-blue-200',
  SATISFACCION: 'bg-amber-100 text-amber-700 border-amber-200',
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

type SP = {
  auditType?: string
  tenantCatering?: string
  page?: string
}

export default async function AuditsPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const params = await searchParams
  const pageNum = Number(params.page ?? '1')

  const [kpis, { audits, total, pageSize }, caterings] = await Promise.all([
    getAuditsKPIs(),
    getRestaurantAudits({
      auditType: (params.auditType as AuditType) || undefined,
      tenantCatering: params.tenantCatering,
      page: pageNum,
      pageSize: 25,
    }),
    prisma.tenant.findMany({
      where: { type: 'CATERING', status: 'ACTIVE' },
      select: { id: true, name: true, subdomain: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/quality">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Calidad
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Auditorías</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Auditorías externas registradas a los caterings. Tres tipos:
          sanitaria (APPCC, inspección), operativa (procesos), satisfacción
          (encuestas a empleados). Los PDFs se referencian por URL externa
          (Drive, Dropbox, S3…).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="mt-1 text-2xl font-bold">{kpis.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Score medio</p>
          <p className={`mt-1 text-2xl font-bold ${scoreColor(kpis.avgScore)}`}>
            {kpis.avgScore}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Con score &lt;60</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{kpis.lowScore}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Sin auditoría 12m</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{kpis.stale}</p>
        </Card>
      </div>

      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Tipo
            </label>
            <select
              name="auditType"
              defaultValue={params.auditType ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="SANITARIA">Sanitaria</option>
              <option value="OPERATIVA">Operativa</option>
              <option value="SATISFACCION">Satisfacción</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Catering
            </label>
            <select
              name="tenantCatering"
              defaultValue={params.tenantCatering ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {caterings.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="outline">
            Aplicar
          </Button>
        </form>
      </Card>

      <NewAuditForm caterings={caterings} />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Catering</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Notas</th>
              <th className="px-4 py-3 text-right">Informe</th>
            </tr>
          </thead>
          <tbody>
            {audits.map((a) => (
              <tr
                key={a.id}
                className="border-b last:border-0 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {a.catering?.name ?? '—'}
                  </div>
                  <div className="font-mono text-[10px] text-gray-500">
                    {a.catering?.subdomain}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[a.auditType]}`}
                  >
                    {TYPE_LABEL[a.auditType]}
                  </span>
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${scoreColor(a.score)}`}
                >
                  {a.score}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {format(a.auditedAt, 'dd MMM yyyy', { locale: es })}
                </td>
                <td className="max-w-[300px] px-4 py-3 text-xs text-gray-600">
                  <div className="truncate" title={a.notes ?? ''}>
                    {a.notes ?? <span className="text-gray-400">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {a.reportUrl ? (
                    <a
                      href={a.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      Ver PDF
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Sin PDF
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
            {audits.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay auditorías registradas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Página {pageNum} de {totalPages} · {total} registros
          </p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: '/admin/quality/audits',
                    query: { ...params, page: String(pageNum - 1) },
                  }}
                >
                  Anterior
                </Link>
              </Button>
            )}
            {pageNum < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: '/admin/quality/audits',
                    query: { ...params, page: String(pageNum + 1) },
                  }}
                >
                  Siguiente
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
