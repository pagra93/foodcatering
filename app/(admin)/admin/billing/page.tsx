import Link from 'next/link'
import {
  ChevronRight,
  CreditCard,
  FileText,
  Landmark,
  Percent,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getBillingDashboardKPIs,
  getBillingMonthlySeries,
  getAccountsOverview,
} from '@/lib/db/queries/admin-billing'
import { GenerateMonthButton } from '@/components/admin/billing/GenerateMonthButton'
import { AccountsOverviewCards } from '@/components/admin/billing/AccountsOverviewCards'
import { BillingTrendChart } from '@/components/admin/billing/BillingTrendChart'

export default async function BillingResumenPage() {
  const [kpis, overview, series] = await Promise.all([
    getBillingDashboardKPIs(),
    getAccountsOverview(),
    getBillingMonthlySeries(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Facturación — Resumen</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Los tres flujos de dinero de la plataforma: la empresa paga la comida al
          catering, el catering paga a Plati la comisión, y la empresa paga a Plati
          su suscripción SaaS. Genera la facturación del mes y revisa aquí el estado
          global.
        </p>
      </div>

      <GenerateMonthButton />

      {/* KPIs de ingreso de Plati */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">MRR SaaS (neto)</p>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-2xl font-bold">{kpis.mrrSaas.toFixed(2)} €</p>
          <p className="mt-1 text-xs text-gray-500">ARR ≈ {kpis.arrSaas.toFixed(0)} €</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Comisión YTD</p>
            <Percent className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-1 text-2xl font-bold">{kpis.commissionsYTD.toFixed(2)} €</p>
          <p className="mt-1 text-xs text-emerald-600">
            {kpis.commissionsPaidYTD.toFixed(2)} € cobradas
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">SaaS cobrado YTD</p>
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-2xl font-bold">{kpis.saasPaidYTD.toFixed(2)} €</p>
          <p className="mt-1 text-xs text-gray-500">
            {kpis.saasYTD.toFixed(2)} € facturado
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Documentos pendientes</p>
            <Landmark className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-1 text-2xl font-bold text-red-600">{kpis.pendingCount}</p>
          <p className="mt-1 text-xs text-gray-500">Liquidaciones + facturas SaaS</p>
        </Card>
      </div>

      {/* Estado de cuentas: los 3 flujos */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Estado de cuentas</h2>
        <AccountsOverviewCards data={overview} />
      </section>

      {/* Tendencia de ingresos (12 meses) */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Ingresos — últimos 12 meses</h2>
        <Card className="p-5">
          <BillingTrendChart series={series} />
          <p className="mt-3 text-xs text-gray-400">
            Comisiones de catering y suscripciones SaaS, ambas en neto (sin IVA).
            Churn y LTV requieren histórico de suscripciones que aún no se registra.
          </p>
        </Card>
      </section>

      {/* Navegación a las secciones */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Secciones</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <SubModule
            href="/admin/billing/invoices"
            icon={FileText}
            iconColor="text-primary"
            title="Facturas de comida"
            description="Todas las facturas catering → empresa. Filtra por catering, empresa, estado o mes."
          />
          <SubModule
            href="/admin/billing/settlements"
            icon={Receipt}
            iconColor="text-emerald-600"
            title="Liquidaciones"
            description="Comisiones que los caterings pagan a Plati (detalle o agregado por catering)."
          />
          <SubModule
            href="/admin/billing/saas-invoices"
            icon={CreditCard}
            iconColor="text-primary"
            title="Facturas SaaS"
            description="Facturación directa de Plati a las empresas por su plan."
          />
          <SubModule
            href="/admin/billing/plans"
            icon={TrendingUp}
            iconColor="text-primary"
            title="Planes SaaS"
            description="Catálogo de planes de empresa y de catering: precio/cobro, límites y features."
          />
          <SubModule
            href="/admin/billing/taxes"
            icon={Landmark}
            iconColor="text-gray-600"
            title="Reglas fiscales"
            description="Tipos de IVA. El aplicado hoy es el general (21%) en las facturas SaaS."
          />
        </div>
      </section>
    </div>
  )
}

function SubModule({
  href,
  icon: Icon,
  iconColor,
  title,
  description,
  badge,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  description: string
  badge?: string
}) {
  return (
    <Link href={href} className="group">
      <Card className="p-5 transition-colors group-hover:bg-gray-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${iconColor}`} />
              <h3 className="font-semibold">{title}</h3>
              {badge && (
                <Badge variant="outline" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  )
}
