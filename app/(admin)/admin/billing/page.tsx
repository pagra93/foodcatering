import Link from 'next/link'
import {
  ChevronRight,
  CreditCard,
  Landmark,
  Percent,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getBillingDashboardKPIs } from '@/lib/db/queries/admin-billing'
import { GenerateMonthButton } from '@/components/admin/billing/GenerateMonthButton'

export default async function BillingDashboardPage() {
  const kpis = await getBillingDashboardKPIs()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Facturación y Planes</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Dos flujos de ingreso: (1) comisión que Plati cobra a los
          caterings, calculada como % sobre lo que facturan a las empresas; y
          (2) facturación SaaS de Plati directamente a las empresas por
          su plan (Starter/Growth/Enterprise).
        </p>
      </div>

      <GenerateMonthButton />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">MRR SaaS</p>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-2xl font-bold">{kpis.mrrSaas.toFixed(2)} €</p>
          <p className="mt-1 text-xs text-gray-500">
            ARR ≈ {kpis.arrSaas.toFixed(0)} €
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Comisión YTD</p>
            <Percent className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-1 text-2xl font-bold">
            {kpis.commissionsYTD.toFixed(2)} €
          </p>
          <p className="mt-1 text-xs text-emerald-600">
            {kpis.commissionsPaidYTD.toFixed(2)} € cobradas
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">SaaS cobrado YTD</p>
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-2xl font-bold">
            {kpis.saasPaidYTD.toFixed(2)} €
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {kpis.saasYTD.toFixed(2)} € facturado
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Pendientes de cobro</p>
            <Landmark className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {kpis.pendingCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Liquidaciones + facturas SaaS
          </p>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SubModule
          href="/admin/billing/plans"
          icon={TrendingUp}
          iconColor="text-primary"
          title="Planes SaaS"
          description="Catálogo editable de planes STARTER/GROWTH/ENTERPRISE con precios, features y límites."
        />
        <SubModule
          href="/admin/billing/settlements"
          icon={Receipt}
          iconColor="text-emerald-600"
          title="Liquidaciones"
          description="Comisiones que los caterings pagan a Plati cada mes."
        />
        <SubModule
          href="/admin/billing/saas-invoices"
          icon={CreditCard}
          iconColor="text-primary"
          title="Facturas SaaS"
          description="Facturación directa de Plati a las empresas por su plan."
        />
        <SubModule
          href="/admin/billing/commissions"
          icon={Percent}
          iconColor="text-amber-600"
          title="Comisiones"
          description="Vista agregada de comisiones devengadas por catering y mes."
        />
        <SubModule
          href="/admin/billing/metrics"
          icon={TrendingUp}
          iconColor="text-primary"
          title="Métricas MRR/ARR"
          description="Evolución del ingreso recurrente, churn y cohortes de empresas."
        />
        <SubModule
          href="/admin/billing/taxes"
          icon={Landmark}
          iconColor="text-gray-600"
          title="Reglas fiscales"
          description="Tipos de IVA configurables: comida (10%), servicios (21%), IGIC (7%)."
        />
      </div>
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
