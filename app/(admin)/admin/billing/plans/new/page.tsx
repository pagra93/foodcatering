import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getFeatureCatalogGrouped } from '@/lib/db/queries/admin-plans-taxes'
import { PlanForm } from '@/components/admin/billing/PlanForm'

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const isCatering = type === 'catering'
  const portal = isCatering ? 'CATERING' : 'EMPRESA'
  const catalog = getFeatureCatalogGrouped(portal)

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
        <h1 className="text-2xl font-bold">
          Nuevo plan de {isCatering ? 'catering' : 'empresa'} a medida
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isCatering
            ? 'Define el modelo de cobro (comisión o precio fijo), el máximo de empresas y las funcionalidades. Podrás asignarlo a un catering desde su ficha.'
            : 'Define precio, límites y funcionalidades. Podrás asignarlo a una empresa desde su ficha.'}
        </p>
      </div>

      <PlanForm
        mode="create"
        catalog={catalog}
        initial={{
          name: '',
          description: '',
          planType: isCatering ? 'CATERING' : 'EMPRESA',
          monthlyPrice: 0,
          yearlyPrice: null,
          maxEmployees: null,
          maxSites: null,
          maxCaterings: null,
          pricingModel: isCatering ? 'COMMISSION' : null,
          commissionPct: isCatering ? 0.05 : null,
          flatMonthlyFee: null,
          maxCompanies: null,
          supportLevel: 'BASIC',
          active: true,
          scope: 'CUSTOM',
          featureKeys: [],
        }}
      />
    </div>
  )
}
