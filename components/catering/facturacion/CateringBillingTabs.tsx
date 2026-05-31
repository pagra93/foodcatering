'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download } from 'lucide-react'
import type { InvoiceStatus, SettlementStatus } from '@prisma/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Tab = 'cobrar' | 'pagar'

type CateringInvoiceRow = {
  id: string
  number: string
  period: string
  total: string
  status: InvoiceStatus
  issueDate: Date
  dueDate: Date
  empresa: { id: string; name: string; subdomain: string } | null
}

type SettlementRow = {
  id: string
  period: string
  grossAmount: string
  commissionRate: string
  commissionAmount: string
  penalties: string
  netOwed: string
  status: SettlementStatus
  dueBy: Date | null
  paidAt: Date | null
  paymentRef: string | null
}

const INVOICE_META: Record<
  InvoiceStatus,
  { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }
> = {
  DRAFT: { label: 'Borrador', variant: 'secondary' },
  ISSUED: { label: 'Emitida', variant: 'outline' },
  SENT: { label: 'Enviada', variant: 'outline' },
  PAID: { label: 'Pagada', variant: 'default' },
  OVERDUE: { label: 'Vencida', variant: 'destructive' },
  CANCELLED: { label: 'Cancelada', variant: 'secondary' },
  VOID: { label: 'Anulada', variant: 'secondary' },
}

const SETTLEMENT_META: Record<
  SettlementStatus,
  { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }
> = {
  DRAFT: { label: 'Borrador', variant: 'secondary' },
  ISSUED: { label: 'Emitida', variant: 'outline' },
  PAID: { label: 'Pagada', variant: 'default' },
  OVERDUE: { label: 'Vencida', variant: 'destructive' },
  CANCELLED: { label: 'Cancelada', variant: 'secondary' },
}

export function CateringBillingTabs({
  invoices,
  settlements,
}: {
  invoices: CateringInvoiceRow[]
  settlements: SettlementRow[]
}) {
  const [tab, setTab] = useState<Tab>('cobrar')

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => setTab('cobrar')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'cobrar'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:bg-white/60'
          }`}
        >
          Cobro a empresas
        </button>
        <button
          type="button"
          onClick={() => setTab('pagar')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'pagar'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:bg-white/60'
          }`}
        >
          Pago a Plati
        </button>
      </div>

      {tab === 'cobrar' && <CobrarTab invoices={invoices} />}
      {tab === 'pagar' && <PagarTab settlements={settlements} />}
    </div>
  )
}

function CobrarTab({ invoices }: { invoices: CateringInvoiceRow[] }) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Nº</th>
            <th className="px-4 py-3 text-left">Empresa</th>
            <th className="px-4 py-3 text-left">Período</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-left">Estado</th>
            <th className="px-4 py-3 text-left">Vencimiento</th>
            <th className="px-4 py-3 text-right">PDF</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs">{i.number}</td>
              <td className="px-4 py-3">{i.empresa?.name ?? '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-600">{i.period}</td>
              <td className="px-4 py-3 text-right font-semibold">
                {Number(i.total).toFixed(2)} €
              </td>
              <td className="px-4 py-3">
                <Badge variant={INVOICE_META[i.status].variant}>
                  {INVOICE_META[i.status].label}
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">
                {format(i.dueDate, 'dd MMM yyyy', { locale: es })}
              </td>
              <td className="px-4 py-3 text-right">
                <a
                  href={`/api/billing/invoice/${i.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Download className="h-3 w-3" />
                  PDF
                </a>
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-12 text-center text-sm text-gray-500"
              >
                Aún no hay facturas emitidas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  )
}

function PagarTab({ settlements }: { settlements: SettlementRow[] }) {
  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/10 p-4 text-xs text-primary">
        <p>
          <strong>Cómo funciona:</strong> cada mes Plati genera una
          liquidación por tu actividad del mes anterior. La comisión se
          calcula sobre tu facturación bruta a empresas. Cuando recibas la
          liquidación, paga por transferencia a la cuenta facilitada y Plati
          la marcará como PAGADA al recibir el ingreso.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Período</th>
              <th className="px-4 py-3 text-right">Gross facturado</th>
              <th className="px-4 py-3 text-right">% Com.</th>
              <th className="px-4 py-3 text-right">Comisión</th>
              <th className="px-4 py-3 text-right">Penalizaciones</th>
              <th className="px-4 py-3 text-right">A pagar</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Vence</th>
              <th className="px-4 py-3 text-right">PDF</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
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
                <td className="px-4 py-3 text-right text-xs text-amber-700">
                  {Number(s.penalties) > 0
                    ? `-${Number(s.penalties).toFixed(2)} €`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {Number(s.netOwed).toFixed(2)} €
                </td>
                <td className="px-4 py-3">
                  <Badge variant={SETTLEMENT_META[s.status].variant}>
                    {SETTLEMENT_META[s.status].label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {s.dueBy ? format(s.dueBy, 'dd MMM yyyy', { locale: es }) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`/api/billing/settlement/${s.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Download className="h-3 w-3" />
                    PDF
                  </a>
                </td>
              </tr>
            ))}
            {settlements.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay liquidaciones emitidas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
