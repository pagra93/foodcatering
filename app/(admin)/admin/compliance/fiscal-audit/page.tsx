import Link from 'next/link'
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getFiscalAuditKPIs,
  getGlobalFiscalReports,
} from '@/lib/db/queries/admin-compliance'
import { parseIntParam, parsePageParam } from '@/lib/utils/search-params'

type SP = { year?: string; page?: string }

function monthLabel(month: number) {
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ]
  return months[month - 1] ?? String(month)
}

export default async function FiscalAuditPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const params = await searchParams
  const year = parseIntParam(params.year, {
    min: 2000,
    max: 2100,
    fallback: new Date().getFullYear(),
  })
  const pageNum = parsePageParam(params.page)

  const [kpis, { reports, total, pageSize }] = await Promise.all([
    getFiscalAuditKPIs(),
    getGlobalFiscalReports({ year, page: pageNum, pageSize: 50 }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

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
        <h1 className="text-2xl font-bold">Auditoría Fiscal</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          FiscalReport mensuales de todas las empresas cliente. Úsalo para
          detectar problemas de deductibilidad IRPF antes de que una
          inspección los revele al cliente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Reportes {year}</p>
          <p className="mt-1 text-2xl font-bold">{kpis.totalReports}</p>
          <p className="mt-1 text-xs text-gray-500">
            {kpis.distinctEmpresas} empresas
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Deductibilidad media</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              kpis.deductibilityRate >= 95
                ? 'text-emerald-600'
                : kpis.deductibilityRate >= 80
                  ? 'text-amber-600'
                  : 'text-red-600'
            }`}
          >
            {kpis.deductibilityRate}%
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Importe deducible</p>
          <p className="mt-1 text-2xl font-bold">
            {kpis.deductible.toFixed(2)} €
          </p>
          <p className="mt-1 text-xs text-red-600">
            -{kpis.nonDeductible.toFixed(2)} no deducible
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Problemas detectados</p>
          <p className="mt-1 text-2xl font-bold">
            {kpis.aboveLimit + kpis.withoutProof + kpis.withIssues}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {kpis.aboveLimit} sobre 11€ · {kpis.withoutProof} sin proof ·{' '}
            {kpis.withIssues} con incidencia
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <form method="get" className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Año
            </label>
            <select
              name="year"
              defaultValue={String(year)}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const y = new Date().getFullYear() - i
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                )
              })}
            </select>
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
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Período</th>
              <th className="px-4 py-3 text-right">Pedidos</th>
              <th className="px-4 py-3 text-right">Importe</th>
              <th className="px-4 py-3 text-right">Deducible %</th>
              <th className="px-4 py-3 text-left">Alertas</th>
              <th className="px-4 py-3 text-left">Integridad</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const problems =
                r.ordersAboveLimit + r.ordersWithoutProof + r.ordersWithIssues
              return (
                <tr
                  key={r.id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium">
                    {r.empresa?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {monthLabel(r.periodMonth)} {r.periodYear}
                  </td>
                  <td className="px-4 py-3 text-right">{r.totalOrders}</td>
                  <td className="px-4 py-3 text-right">
                    {Number(r.totalAmount).toFixed(2)} €
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      Number(r.deductibilityRate) >= 95
                        ? 'text-emerald-600'
                        : Number(r.deductibilityRate) >= 80
                          ? 'text-amber-600'
                          : 'text-red-600'
                    }`}
                  >
                    {Number(r.deductibilityRate).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3">
                    {problems === 0 ? (
                      <Badge variant="default" className="text-[10px]">
                        OK
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">
                        {problems}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.signatureHash ? (
                      <span
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-700"
                        title={r.signatureHash}
                      >
                        <CheckCircle className="h-3 w-3" />
                        {r.signatureHash.slice(0, 8)}…
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        sin firma
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {reports.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay FiscalReports para el año {year}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Página {pageNum} de {totalPages} · {total} reportes
          </p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: '/admin/compliance/fiscal-audit',
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
                    pathname: '/admin/compliance/fiscal-audit',
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
