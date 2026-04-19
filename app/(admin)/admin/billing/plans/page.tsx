import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getSaasPlanStats } from '@/lib/db/queries/admin-plans-taxes'

export default async function PlansPage() {
  const plans = await getSaasPlanStats()

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
        <h1 className="text-2xl font-bold">Planes SaaS</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Cada empresa cliente tiene asignado uno de estos planes
          (Company.plan). Las facturas SaaS mensuales se calculan usando
          monthlyPrice del plan asignado.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <Card
            key={p.id}
            className={`relative p-6 ${!p.active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {p.code}
                </p>
                <h3 className="mt-1 text-xl font-bold">{p.name}</h3>
              </div>
              {!p.active && <Badge variant="destructive">Inactivo</Badge>}
            </div>

            <p className="mt-3 min-h-[2.5rem] text-sm text-gray-600">
              {p.description ?? '—'}
            </p>

            <div className="mt-4">
              <span className="text-3xl font-bold">
                {Number(p.monthlyPrice).toFixed(0)} €
              </span>
              <span className="text-sm text-gray-500"> / mes</span>
              {p.yearlyPrice && (
                <p className="mt-1 text-xs text-gray-500">
                  o {Number(p.yearlyPrice).toFixed(0)} €/año (ahorro{' '}
                  {Math.round(
                    (1 -
                      Number(p.yearlyPrice) / (Number(p.monthlyPrice) * 12)) *
                      100
                  )}
                  %)
                </p>
              )}
            </div>

            <div className="mt-5 space-y-2 border-t pt-4 text-sm">
              {p.maxEmployees && (
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Hasta {p.maxEmployees} empleados
                </div>
              )}
              {!p.maxEmployees && (
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Empleados ilimitados
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Soporte {p.supportLevel.toLowerCase()}
              </div>
            </div>

            <div className="mt-5 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-600">
                  <Users className="h-3.5 w-3.5" />
                  Empresas activas
                </span>
                <Badge variant="outline">{p.activeCompanies}</Badge>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                MRR: <strong>{p.monthlyRevenue.toFixed(2)} €</strong>
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-gray-50/60 p-4 text-xs text-gray-600">
        <p>
          <strong>Edición de planes:</strong> por ahora los precios se
          modifican en BD directamente o vía script. UI editor inline se
          añadirá en siguiente iteración. Los cambios aplican a facturas
          SaaS futuras (las emitidas conservan el precio en `planName`
          snapshot).
        </p>
      </Card>
    </div>
  )
}
