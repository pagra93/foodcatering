import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getPlansWithCounts } from '@/lib/db/queries/admin-plans-taxes'

function limitLabel(n: number | null) {
  return n == null ? '∞' : String(n)
}

export default async function PlansPage() {
  const plans = await getPlansWithCounts()

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

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Planes SaaS</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Cada empresa tiene un plan que define su precio, sus límites (empleados,
            sedes, caterings) y las funcionalidades disponibles. Edita los planes o
            crea uno a medida.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/billing/plans/new">
            <Plus className="mr-2 h-4 w-4" />
            Crear plan
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className={`flex flex-col p-5 ${!p.active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  <Badge variant={p.scope === 'SYSTEM' ? 'secondary' : 'outline'}>
                    {p.scope === 'SYSTEM' ? 'Sistema' : 'A medida'}
                  </Badge>
                </div>
                <p className="font-mono text-xs text-gray-400">{p.code}</p>
              </div>
              {!p.active && <Badge variant="destructive">Inactivo</Badge>}
            </div>

            <p className="mt-2 min-h-[2.5rem] text-sm text-gray-600">
              {p.description ?? '—'}
            </p>

            <p className="mt-2 text-2xl font-bold">
              {p.monthlyPrice}
              <span className="text-sm font-normal text-gray-500"> €/mes</span>
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded bg-gray-50 p-2">
                <p className="font-semibold">{limitLabel(p.maxEmployees)}</p>
                <p className="text-gray-500">empleados</p>
              </div>
              <div className="rounded bg-gray-50 p-2">
                <p className="font-semibold">{limitLabel(p.maxSites)}</p>
                <p className="text-gray-500">sedes</p>
              </div>
              <div className="rounded bg-gray-50 p-2">
                <p className="font-semibold">{limitLabel(p.maxCaterings)}</p>
                <p className="text-gray-500">caterings</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
              <span>{p.featuresCount} features de pago</span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {p.companiesCount} empresa(s)
              </span>
            </div>

            <div className="mt-4 flex-1" />
            <Button variant="outline" size="sm" asChild className="mt-2">
              <Link href={`/admin/billing/plans/${p.id}`}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Editar
              </Link>
            </Button>
          </Card>
        ))}
        {plans.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-500">No hay planes.</p>
        )}
      </div>
    </div>
  )
}
