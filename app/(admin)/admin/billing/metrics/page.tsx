import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getBillingDashboardKPIs,
  getBillingMonthlySeries,
} from '@/lib/db/queries/admin-billing'

export default async function MetricsPage() {
  const [kpis, series] = await Promise.all([
    getBillingDashboardKPIs(),
    getBillingMonthlySeries(),
  ])

  const maxCommission = Math.max(...series.map((s) => s.commissions), 1)
  const maxSaas = Math.max(...series.map((s) => s.saas), 1)
  const maxAny = Math.max(maxCommission, maxSaas)

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
        <h1 className="text-2xl font-bold">Métricas MRR / ARR</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Ingreso recurrente mensual (MRR) y anualizado (ARR). El MRR incluye
          únicamente el ingreso SaaS (plan por empresa); la comisión
          catering es variable según facturación real.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">MRR (SaaS)</p>
          <p className="mt-1 text-2xl font-bold">{kpis.mrrSaas.toFixed(2)} €</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">ARR estimado</p>
          <p className="mt-1 text-2xl font-bold">{kpis.arrSaas.toFixed(0)} €</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Empresas activas</p>
          <p className="mt-1 text-2xl font-bold">{kpis.activeCompanies}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Gross facturado mes</p>
          <p className="mt-1 text-2xl font-bold">
            {kpis.grossThisMonth.toFixed(2)} €
          </p>
          <p className="mt-1 text-xs text-gray-500">
            mes pasado: {kpis.grossLastMonth.toFixed(2)} €
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-base font-semibold">
          Últimos 12 meses — ingresos
        </h3>
        <div className="space-y-3">
          {series.map((s) => (
            <div key={s.period} className="text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="w-20 font-mono text-gray-600">{s.period}</span>
                <span className="text-gray-500">
                  Com: {s.commissions.toFixed(2)} € · SaaS: {s.saas.toFixed(2)} €
                </span>
              </div>
              <div className="flex h-3 gap-0.5">
                <div
                  className="rounded-sm bg-emerald-500"
                  style={{
                    width: `${maxAny === 0 ? 0 : (s.commissions / maxAny) * 50}%`,
                  }}
                  title={`Comisiones ${s.commissions.toFixed(2)} €`}
                />
                <div
                  className="rounded-sm bg-blue-500"
                  style={{
                    width: `${maxAny === 0 ? 0 : (s.saas / maxAny) * 50}%`,
                  }}
                  title={`SaaS ${s.saas.toFixed(2)} €`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-emerald-500" />
            Comisiones catering
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-blue-500" />
            SaaS a empresas
          </span>
        </div>
      </Card>

      <Card className="bg-gray-50/60 p-4 text-xs text-gray-600">
        <p>
          <strong>Churn &amp; LTV:</strong> placeholder — se calculan cuando
          tengas histórico mínimo de 6 meses de suscripciones activas y
          cancelaciones. Por ahora el MRR es el dato más accionable.
        </p>
      </Card>
    </div>
  )
}
