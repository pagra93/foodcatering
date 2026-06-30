/**
 * Facturación & Pagos del catering (datos reales).
 * Recibe KPIs + facturas emitidas + liquidaciones desde el server.
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'

export type BillingInvoice = {
  id: string
  number: string
  period: string
  empresa: string
  total: number
  status: string
  issueDate: Date | null
  paidAt: Date | null
}

export type BillingSettlement = {
  id: string
  period: string
  grossAmount: number
  commissionAmount: number
  penalties: number
  netOwed: number
  status: string
  paidAt: Date | null
}

type Props = {
  kpis: {
    emitidasTotalYTD: number
    pendingCobrarAmount: number
    commissionsYTD: number
    pendingPagarAmount: number
  }
  invoices: BillingInvoice[]
  settlements: BillingSettlement[]
}

function statusVariant(status: string): 'success' | 'destructive' | 'secondary' | 'outline' {
  if (status === 'PAID') return 'success'
  if (status === 'OVERDUE' || status === 'VOID') return 'destructive'
  if (status === 'DRAFT') return 'outline'
  return 'secondary'
}

export function BillingPaymentsTab({ kpis, invoices, settlements }: Props) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Facturado a empresas (año)</p>
          <p className="mt-1 text-2xl font-bold">{formatPrice(kpis.emitidasTotalYTD)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pendiente de cobro</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {formatPrice(kpis.pendingCobrarAmount)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Comisiones Plati (año)</p>
          <p className="mt-1 text-2xl font-bold">{formatPrice(kpis.commissionsYTD)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pendiente de pago a Plati</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {formatPrice(kpis.pendingPagarAmount)}
          </p>
        </Card>
      </div>

      {/* Facturas emitidas */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Facturas emitidas a empresas
        </h3>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Número</th>
                <th className="px-4 py-3 text-left">Empresa</th>
                <th className="px-4 py-3 text-left">Período</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Emitida</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{i.number}</td>
                  <td className="px-4 py-3">{i.empresa}</td>
                  <td className="px-4 py-3 text-gray-600">{i.period}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatPrice(i.total)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(i.status)}>{i.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {i.issueDate ? format(i.issueDate, 'dd MMM yyyy', { locale: es }) : '—'}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                    Este catering no tiene facturas emitidas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Liquidaciones */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Liquidaciones a Plati (comisión)
        </h3>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Período</th>
                <th className="px-4 py-3 text-right">Bruto</th>
                <th className="px-4 py-3 text-right">Comisión</th>
                <th className="px-4 py-3 text-right">Penalizaciones</th>
                <th className="px-4 py-3 text-right">Neto a pagar</th>
                <th className="px-4 py-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{s.period}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(s.grossAmount)}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(s.commissionAmount)}</td>
                  <td className="px-4 py-3 text-right text-red-600">
                    {s.penalties > 0 ? `-${formatPrice(s.penalties)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatPrice(s.netOwed)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                  </td>
                </tr>
              ))}
              {settlements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                    Todavía no hay liquidaciones generadas para este catering.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
