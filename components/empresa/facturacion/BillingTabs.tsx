'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, TrendingUp } from 'lucide-react'
import type {
  InvoiceStatus,
  SaasInvoiceStatus,
} from '@prisma/client'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  effectiveStatus,
  statusMeta,
  INVOICE_STATUS,
  SAAS_STATUS,
} from '@/lib/billing/status'

type Tab = 'resumen' | 'catering' | 'saas'

type CateringInvoice = {
  id: string
  period: string
  number: string
  issueDate: Date
  dueDate: Date
  total: string
  status: InvoiceStatus
  catering: { id: string; name: string; subdomain: string } | null
}

type SaasInvoice = {
  id: string
  period: string
  number: string
  planName: string
  total: string
  status: SaasInvoiceStatus
  issuedAt: Date | null
  dueBy: Date | null
}

type Props = {
  kpis: {
    cateringTotalYTD: number
    cateringPendingAmount: number
    cateringPendingCount: number
    saasTotalYTD: number
    saasPendingAmount: number
    saasPendingCount: number
    currentPlan: { code: string; name: string; monthlyPrice: number } | null
    companyName: string | null
  }
  cateringInvoices: CateringInvoice[]
  saasInvoices: SaasInvoice[]
}

export function BillingTabs({ kpis, cateringInvoices, saasInvoices }: Props) {
  const [tab, setTab] = useState<Tab>('resumen')

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {(
          [
            { id: 'resumen', label: 'Resumen anual' },
            { id: 'catering', label: 'Del catering' },
            { id: 'saas', label: 'De Plati (SaaS)' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <ResumenTab kpis={kpis} />}
      {tab === 'catering' && <CateringTab invoices={cateringInvoices} />}
      {tab === 'saas' && <SaasTab invoices={saasInvoices} />}
    </div>
  )
}

function ResumenTab({ kpis }: { kpis: Props['kpis'] }) {
  const totalYTD = kpis.cateringTotalYTD + kpis.saasTotalYTD
  const totalPending =
    kpis.cateringPendingAmount + kpis.saasPendingAmount

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Gasto total YTD</p>
          <p className="mt-1 text-2xl font-bold">{totalYTD.toFixed(2)} €</p>
          <p className="mt-1 text-xs text-gray-500">
            {kpis.cateringTotalYTD.toFixed(2)} catering +{' '}
            {kpis.saasTotalYTD.toFixed(2)} SaaS
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pendiente de pago</p>
          <p
            className={`mt-1 text-2xl font-bold ${totalPending > 0 ? 'text-red-600' : ''}`}
          >
            {totalPending.toFixed(2)} €
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {kpis.cateringPendingCount + kpis.saasPendingCount} facturas
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Plan actual</p>
          <p className="mt-1 text-2xl font-bold">
            {kpis.currentPlan?.name ?? '—'}
          </p>
          {kpis.currentPlan && (
            <p className="mt-1 text-xs text-gray-500">
              {kpis.currentPlan.monthlyPrice.toFixed(2)} € / mes
            </p>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Próxima factura SaaS</p>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-2xl font-bold">
            {kpis.currentPlan
              ? `${kpis.currentPlan.monthlyPrice.toFixed(2)} €`
              : '—'}
          </p>
          <p className="mt-1 text-xs text-gray-500">día 1 del próximo mes</p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 text-base font-semibold">
          ¿Quién me factura qué?
        </h3>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-700">
              Del catering
            </p>
            <h4 className="mt-1 font-semibold">
              Pedidos de comida entregados
            </h4>
            <p className="mt-2 text-xs text-gray-700">
              El catering factura mensualmente todos los pedidos entregados
              del mes. Pagas directamente al catering.
            </p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/10 p-4">
            <p className="text-xs uppercase tracking-wide text-primary">
              De Plati
            </p>
            <h4 className="mt-1 font-semibold">
              Suscripción plan {kpis.currentPlan?.name ?? 'SaaS'}
            </h4>
            <p className="mt-2 text-xs text-gray-700">
              Cuota mensual fija por el uso de la plataforma. Incluye todas
              las funcionalidades de tu plan.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function CateringTab({ invoices }: { invoices: CateringInvoice[] }) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Nº</th>
            <th className="px-4 py-3 text-left">Catering</th>
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
              <td className="px-4 py-3">{i.catering?.name ?? '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-600">{i.period}</td>
              <td className="px-4 py-3 text-right font-semibold">
                {Number(i.total).toFixed(2)} €
              </td>
              <td className="px-4 py-3">
                {(() => {
                  const meta = statusMeta(
                    INVOICE_STATUS,
                    effectiveStatus(i.status, i.dueDate)
                  )
                  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                })()}
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
                Aún no hay facturas del catering.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  )
}

function SaasTab({ invoices }: { invoices: SaasInvoice[] }) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Nº</th>
            <th className="px-4 py-3 text-left">Período</th>
            <th className="px-4 py-3 text-left">Plan</th>
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
              <td className="px-4 py-3 text-xs text-gray-600">{i.period}</td>
              <td className="px-4 py-3">{i.planName}</td>
              <td className="px-4 py-3 text-right font-semibold">
                {Number(i.total).toFixed(2)} €
              </td>
              <td className="px-4 py-3">
                {(() => {
                  const meta = statusMeta(SAAS_STATUS, effectiveStatus(i.status, i.dueBy))
                  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                })()}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">
                {i.dueBy ? format(i.dueBy, 'dd MMM yyyy', { locale: es }) : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <a
                  href={`/api/billing/saas-invoice/${i.id}/pdf`}
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
                No tienes facturas SaaS aún. Se generan el día 1 de cada mes.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  )
}
