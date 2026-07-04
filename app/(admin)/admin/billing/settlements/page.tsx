import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { SettlementStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  getSettlements,
  getSettlementsKPIs,
  getCommissionsByCatering,
} from '@/lib/db/queries/admin-settlements'
import { effectiveStatus, statusMeta, SETTLEMENT_STATUS } from '@/lib/billing/status'
import { MarkPaidButton } from '@/components/admin/billing/MarkPaidButton'

type SP = { status?: string; period?: string; page?: string; view?: string }

/** Pestañas "Detalle | Por catering" (la vista por catering sustituye a la antigua sección Comisiones). */
function ViewTabs({ view, params }: { view: 'detalle' | 'catering'; params: SP }) {
  const base = { pathname: '/admin/billing/settlements' as const }
  const tab = (v: 'detalle' | 'catering', label: string) => {
    const active = view === v
    return (
      <Link
        href={{ ...base, query: { ...params, view: v, page: undefined } }}
        className={`rounded-md px-3 py-1.5 text-sm font-medium ${
          active ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        {label}
      </Link>
    )
  }
  return (
    <div className="inline-flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
      {tab('detalle', 'Detalle')}
      {tab('catering', 'Por catering')}
    </div>
  )
}

export default async function SettlementsPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const params = await searchParams
  const pageNum = Number(params.page ?? '1')
  const view: 'detalle' | 'catering' = params.view === 'catering' ? 'catering' : 'detalle'

  const [{ settlements, total, pageSize }, kpis, byCatering] = await Promise.all([
    getSettlements({
      status: (params.status as SettlementStatus) || undefined,
      period: params.period,
      page: pageNum,
      pageSize: 25,
    }),
    getSettlementsKPIs(),
    view === 'catering' ? getCommissionsByCatering() : Promise.resolve([]),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/billing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Facturación
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Liquidaciones</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Comisiones mensuales que los caterings pagan a Plati. Se
          generan automáticamente con "Generar" en el dashboard billing.
          Marca como pagada cuando recibas la transferencia.
        </p>
      </div>

      <ViewTabs view={view} params={params} />

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Borradores</p>
          <p className="mt-1 text-2xl font-bold">{kpis.draft}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Emitidas</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{kpis.issued}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Vencidas</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{kpis.overdue}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pagadas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{kpis.paid}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pendiente de cobro</p>
          <p className="mt-1 text-2xl font-bold">
            {kpis.pendingAmount.toFixed(2)} €
          </p>
        </Card>
      </div>

      {view === 'detalle' && (
      <>
      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="view" value="detalle" />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Estado
            </label>
            <select
              name="status"
              defaultValue={params.status ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="DRAFT">Borrador</option>
              <option value="ISSUED">Emitida</option>
              <option value="PAID">Pagada</option>
              <option value="OVERDUE">Vencida</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Período (YYYY-MM)
            </label>
            <input
              type="month"
              name="period"
              defaultValue={params.period ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <Button type="submit" variant="outline">
            Aplicar
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Catering</th>
              <th className="px-4 py-3 text-left">Período</th>
              <th className="px-4 py-3 text-right">Base (sin IVA)</th>
              <th className="px-4 py-3 text-right">%</th>
              <th className="px-4 py-3 text-right">Comisión</th>
              <th className="px-4 py-3 text-right">Neto</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Vencimiento</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{s.catering?.name ?? '—'}</div>
                  <div className="font-mono text-[10px] text-gray-500">
                    {s.catering?.subdomain}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{s.period}</td>
                <td className="px-4 py-3 text-right">
                  {Number(s.grossAmount).toFixed(2)} €
                </td>
                <td className="px-4 py-3 text-right text-xs">
                  {(Number(s.commissionRate) * 100).toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right">
                  {Number(s.commissionAmount).toFixed(2)} €
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {Number(s.netOwed).toFixed(2)} €
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const meta = statusMeta(
                      SETTLEMENT_STATUS,
                      effectiveStatus(s.status, s.dueBy)
                    )
                    return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                  })()}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {s.dueBy ? format(s.dueBy, 'dd MMM yyyy', { locale: es }) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <a
                      href={`/api/billing/settlement/${s.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Descargar PDF"
                    >
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 text-primary" />
                      </Button>
                    </a>
                    {(s.status === 'ISSUED' || s.status === 'OVERDUE') && (
                      <MarkPaidButton id={s.id} kind="settlement" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {settlements.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay liquidaciones. Pulsa "Generar" en el dashboard.
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
                    pathname: '/admin/billing/settlements',
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
                    pathname: '/admin/billing/settlements',
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
      </>
      )}

      {view === 'catering' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Catering</th>
                  <th className="px-4 py-3 text-right">Base facturada</th>
                  <th className="px-4 py-3 text-right">Comisión total</th>
                  <th className="px-4 py-3 text-right">Cobrado</th>
                  <th className="px-4 py-3 text-right">Pendiente</th>
                  <th className="px-4 py-3 text-center">Liquidaciones</th>
                </tr>
              </thead>
              <tbody>
                {byCatering.map((c) => (
                  <tr key={c.tenantCatering} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.name}</div>
                      <div className="font-mono text-[10px] text-gray-500">{c.subdomain}</div>
                    </td>
                    <td className="px-4 py-3 text-right">{c.totalGross.toFixed(2)} €</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {c.totalCommission.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600">
                      {c.paidCommission.toFixed(2)} €
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${c.pendingCommission > 0 ? 'text-amber-600' : 'text-gray-400'}`}
                    >
                      {c.pendingCommission.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {c.count}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {byCatering.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                      Sin liquidaciones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
