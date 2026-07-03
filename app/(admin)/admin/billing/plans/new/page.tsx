import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getFeatureCatalogGrouped } from '@/lib/db/queries/admin-plans-taxes'
import { PlanForm } from '@/components/admin/billing/PlanForm'

export default function NewPlanPage() {
  const catalog = getFeatureCatalogGrouped()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/billing/plans">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Planes
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Nuevo plan a medida</h1>
        <p className="mt-1 text-sm text-gray-500">
          Define precio, límites y funcionalidades. Podrás asignarlo a una empresa
          desde su ficha.
        </p>
      </div>

      <PlanForm
        mode="create"
        catalog={catalog}
        initial={{
          name: '',
          description: '',
          monthlyPrice: 0,
          yearlyPrice: null,
          maxEmployees: null,
          maxSites: null,
          maxCaterings: null,
          supportLevel: 'BASIC',
          active: true,
          scope: 'CUSTOM',
          featureKeys: [],
        }}
      />
    </div>
  )
}
