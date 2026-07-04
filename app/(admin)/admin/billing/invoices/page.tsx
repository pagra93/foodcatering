import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { InvoiceStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  getAdminInvoices,
  getAdminInvoicesKPIs,
  getInvoiceFilterOptions,
} from '@/lib/db/queries/admin-invoices'
import { effectiveStatus, statusMeta, INVOICE_STATUS } from '@/lib/billing/status'

type SP = {
  status?: string
  period?: string
  catering?: string
  empresa?: string
  page?: string
}

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const params = await searchParams
  const pageNum = Number(params.page ?? '1')

  const [{ invoices, total, pageSize }, kpis, options] = await Promise.all([
    getAdminInvoices({
      status: (params.status as InvoiceStatus) || undefined,
      period: params.period || undefined,
      tenantCatering: params.catering || undefined,
      tenantEmpresa: params.empresa || undefined,
      page: pageNum,
      pageSize: 25,
    }),
    getAdminInvoicesKPIs(),
    getInvoiceFilterOptions(),
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
        <h1 className="text-2xl font-bold">Facturas de comida</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Todas las facturas que los caterings emiten a las empresas por la comida
          servida. Es la base sobre la que se calcula la comisión de Plati. Las
          genera cada catering desde su portal.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
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
          <p className="mt-1 text-2xl font-bold">{kpis.pendingAmount.toFixed(2)} €</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total facturado</p>
          <p className="mt-1 text-2xl font-bold">{kpis.totalBilled.toFixed(2)} €</p>
        </Card>
      </div>

      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Catering</label>
            <select
              name="catering"
              defaultValue={params.catering ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {options.caterings.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Empresa</label>
            <select
              name="empresa"
              defaultValue={params.empresa ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {options.empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Estado</label>
            <select
              name="status"
              defaultValue={params.status ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="DRAFT">Borrador</option>
              <option value="ISSUED">Emitida</option>
              <option value="SENT">Enviada</option>
              <option value="PAID">Pagada</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Período</label>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Nº</th>
                <th className="px-4 py-3 text-left">Catering</th>
                <th className="px-4 py-3 text-left">Empresa</th>
                <th className="px-4 py-3 text-left">Período</th>
                <th className="px-4 py-3 text-right">Base</th>
                <th className="px-4 py-3 text-right">IVA</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Vence</th>
                <th className="px-4 py-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const meta = statusMeta(
                  INVOICE_STATUS,
                  effectiveStatus(inv.status, inv.dueDate)
                )
                return (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{inv.number}</td>
                    <td className="px-4 py-3">{inv.catering?.name ?? '—'}</td>
                    <td className="px-4 py-3">{inv.empresa?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{inv.period}</td>
                    <td className="px-4 py-3 text-right">{inv.subtotal.toFixed(2)} €</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600">
                      {inv.taxAmount.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {inv.total.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {format(inv.dueDate, 'dd MMM yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/api/billing/invoice/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Descargar PDF"
                      >
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4 text-primary" />
                        </Button>
                      </a>
                    </td>
                  </tr>
                )
              })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-500">
                    No hay facturas con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                    pathname: '/admin/billing/invoices',
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
                    pathname: '/admin/billing/invoices',
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
