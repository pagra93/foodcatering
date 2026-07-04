import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getPlansWithCounts } from '@/lib/db/queries/admin-plans-taxes'

function limitLabel(n: number | null) {
  return n == null ? '∞' : String(n)
}

type PlanRow = Awaited<ReturnType<typeof getPlansWithCounts>>[number]

function priceLabel(p: PlanRow): string {
  if (p.planType === 'CATERING') {
    if (p.pricingModel === 'FIXED') return `${p.flatMonthlyFee ?? 0} €/mes`
    return `${((p.commissionPct ?? 0) * 100).toFixed(1)}% comisión`
  }
  return `${p.monthlyPrice} €/mes`
}

function PlanCard({ p }: { p: PlanRow }) {
  const isCatering = p.planType === 'CATERING'
  return (
    <Card className={`flex flex-col p-5 ${!p.active ? 'opacity-60' : ''}`}>
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

      <p className="mt-2 min-h-[2.5rem] text-sm text-gray-600">{p.description ?? '—'}</p>

      <p className="mt-2 text-2xl font-bold">{priceLabel(p)}</p>

      <div className={`mt-3 grid gap-2 text-center text-xs ${isCatering ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {isCatering ? (
          <div className="rounded bg-gray-50 p-2">
            <p className="font-semibold">{limitLabel(p.maxCompanies)}</p>
            <p className="text-gray-500">empresas máx.</p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
        <span>{p.featuresCount} features de pago</span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {p.assignedCount} {isCatering ? 'catering(s)' : 'empresa(s)'}
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
  )
}

export default async function PlansPage() {
  const plans = await getPlansWithCounts()
  const empresaPlans = plans.filter((p) => p.planType === 'EMPRESA')
  const cateringPlans = plans.filter((p) => p.planType === 'CATERING')

  return (
    <div className="space-y-8">
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
          Planes diferenciados para empresas y caterings: precio/cobro, límites y
          funcionalidades. Edita los de sistema o crea uno a medida.
        </p>
      </div>

      {/* Empresas */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Planes de empresa</h2>
          <Button asChild size="sm">
            <Link href="/admin/billing/plans/new?type=empresa">
              <Plus className="mr-2 h-4 w-4" />
              Crear plan de empresa
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {empresaPlans.map((p) => (
            <PlanCard key={p.id} p={p} />
          ))}
          {empresaPlans.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">Sin planes de empresa.</p>
          )}
        </div>
      </section>

      {/* Caterings */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Planes de catering</h2>
          <Button asChild size="sm">
            <Link href="/admin/billing/plans/new?type=catering">
              <Plus className="mr-2 h-4 w-4" />
              Crear plan de catering
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cateringPlans.map((p) => (
            <PlanCard key={p.id} p={p} />
          ))}
          {cateringPlans.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">Sin planes de catering.</p>
          )}
        </div>
      </section>
    </div>
  )
}
