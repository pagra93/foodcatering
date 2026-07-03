import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getPlanDetail,
  getFeatureCatalogGrouped,
} from '@/lib/db/queries/admin-plans-taxes'
import { PlanForm } from '@/components/admin/billing/PlanForm'

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [plan, catalog] = await Promise.all([
    getPlanDetail(id),
    getFeatureCatalogGrouped(),
  ])
  if (!plan) notFound()

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
        <h1 className="text-2xl font-bold">{plan.name}</h1>
        <p className="mt-1 font-mono text-xs text-gray-400">{plan.code}</p>
      </div>

      <PlanForm
        mode="edit"
        planId={plan.id}
        catalog={catalog}
        initial={{
          name: plan.name,
          description: plan.description ?? '',
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          maxEmployees: plan.maxEmployees,
          maxSites: plan.maxSites,
          maxCaterings: plan.maxCaterings,
          supportLevel: plan.supportLevel,
          active: plan.active,
          scope: plan.scope,
          featureKeys: plan.featureKeys,
          companiesCount: plan.companiesCount,
        }}
      />
    </div>
  )
}
