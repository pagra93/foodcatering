import Link from 'next/link'
import { ArrowLeft, AlertTriangle, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getDashboardAlerts } from '@/lib/db/queries/admin-dashboard'

export default async function CompaniesAlertsPage() {
  const alerts = await getDashboardAlerts()
  const { inactiveCompanies, cancellationSpikes } = alerts
  const totalAlerts = inactiveCompanies.length + cancellationSpikes.length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/empresas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Empresas
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Alertas de Empresas</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Señales que requieren atención: empresas activas sin actividad y picos de
          cancelaciones. {totalAlerts === 0 && 'Ahora mismo no hay alertas.'}
        </p>
      </div>

      {totalAlerts === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="mt-4 text-base font-semibold text-gray-900">Todo en orden</p>
          <p className="mt-1 text-sm text-gray-500">No hay alertas de empresas en este momento.</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Picos de cancelaciones */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-semibold text-gray-900">Picos de cancelaciones (hoy)</h2>
              {cancellationSpikes.length > 0 && (
                <Badge variant="destructive">{cancellationSpikes.length}</Badge>
              )}
            </div>
            {cancellationSpikes.length === 0 ? (
              <p className="text-sm text-gray-400">Sin picos de cancelación hoy.</p>
            ) : (
              <ul className="space-y-3">
                {cancellationSpikes.map((s) => (
                  <li key={s.tenantId} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                    <Link href={`/admin/empresas/${s.tenantId}`} className="text-sm font-medium text-primary hover:underline">
                      {s.tenantName}
                    </Link>
                    <span className="text-xs text-red-600">
                      {s.cancelled}/{s.total} cancelados ({s.percentage}%)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Empresas sin pedidos */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-gray-900">Empresas sin pedidos (7+ días)</h2>
              {inactiveCompanies.length > 0 && (
                <Badge variant="secondary">{inactiveCompanies.length}</Badge>
              )}
            </div>
            {inactiveCompanies.length === 0 ? (
              <p className="text-sm text-gray-400">Todas las empresas activas tienen pedidos recientes.</p>
            ) : (
              <ul className="space-y-3">
                {inactiveCompanies.map((c) => (
                  <li key={c.id} className="border-b border-gray-100 pb-2 last:border-0">
                    <Link href={`/admin/empresas/${c.id}`} className="text-sm font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
