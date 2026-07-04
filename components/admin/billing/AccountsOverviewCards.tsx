import Link from 'next/link'
import {
  ArrowRight,
  UtensilsCrossed,
  Percent,
  CreditCard,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { AccountsOverview } from '@/lib/db/queries/admin-billing'

const eur = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })

type FlowKey = keyof AccountsOverview

type FlowDef = {
  key: FlowKey
  title: string
  from: string
  to: string
  icon: LucideIcon
  href: string
  note: string
}

const FLOWS: FlowDef[] = [
  {
    key: 'food',
    title: 'Comida',
    from: 'Empresa',
    to: 'Catering',
    icon: UtensilsCrossed,
    href: '/admin/billing/invoices',
    note: 'Facturas que el catering emite a la empresa por la comida servida.',
  },
  {
    key: 'commission',
    title: 'Comisiones',
    from: 'Catering',
    to: 'Plati',
    icon: Percent,
    href: '/admin/billing/settlements',
    note: 'Liquidación mensual de la comisión del catering (neto tras penalizaciones).',
  },
  {
    key: 'saas',
    title: 'Suscripción SaaS',
    from: 'Empresa',
    to: 'Plati',
    icon: CreditCard,
    href: '/admin/billing/saas-invoices',
    note: 'Facturas de Plati a la empresa por su plan de suscripción.',
  },
]

function FlowCard({ def, data }: { def: FlowDef; data: AccountsOverview[FlowKey] }) {
  const Icon = def.icon
  const collectedPct = data.billed > 0 ? Math.round((data.paid / data.billed) * 100) : 0
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
            <Icon className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold">{def.title}</h3>
            <p className="flex items-center gap-1 text-xs text-gray-500">
              {def.from} <ArrowRight className="h-3 w-3" /> {def.to}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Facturado</p>
          <p className="mt-0.5 text-lg font-bold">{eur(data.billed)}</p>
        </div>
        <div className="rounded-md bg-emerald-50 p-3">
          <p className="text-xs text-emerald-700">Cobrado</p>
          <p className="mt-0.5 text-lg font-bold text-emerald-700">{eur(data.paid)}</p>
        </div>
        <div className="rounded-md bg-amber-50 p-3">
          <p className="text-xs text-amber-700">Pendiente</p>
          <p className="mt-0.5 text-lg font-bold text-amber-700">{eur(data.pending)}</p>
        </div>
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-xs text-red-700">Vencido</p>
          <p className="mt-0.5 text-lg font-bold text-red-700">{eur(data.overdue)}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>Cobrado</span>
          <span>{collectedPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${collectedPct}%` }} />
        </div>
      </div>

      <p className="mt-3 min-h-[2.5rem] text-xs text-gray-400">{def.note}</p>

      <div className="mt-3 flex-1" />
      <Button variant="outline" size="sm" asChild className="mt-2">
        <Link href={def.href}>
          Ver detalle
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Link>
      </Button>
    </Card>
  )
}

/** Estado de cuentas: pendiente/vencido a favor de Plati + los 3 flujos de dinero. */
export function AccountsOverviewCards({ data }: { data: AccountsOverview }) {
  const pendingToPlati = data.commission.pending + data.saas.pending
  const overdueToPlati = data.commission.overdue + data.saas.overdue

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-gray-500">Pendiente de cobro de Plati</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">{eur(pendingToPlati)}</p>
          <p className="mt-1 text-xs text-gray-500">
            Comisiones + suscripciones SaaS aún sin cobrar.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500">Vencido a favor de Plati</p>
          <p className="mt-1 text-3xl font-bold text-red-600">{eur(overdueToPlati)}</p>
          <p className="mt-1 text-xs text-gray-500">
            Parte de lo pendiente cuya fecha de vencimiento ya pasó.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {FLOWS.map((def) => (
          <FlowCard key={def.key} def={def} data={data[def.key]} />
        ))}
      </div>
    </div>
  )
}
