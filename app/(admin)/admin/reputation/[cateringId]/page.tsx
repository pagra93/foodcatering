import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/db/prisma'
import {
  getCateringReputation,
  getCateringDishTable,
  getCateringReputationByCompany,
  getCateringComments,
} from '@/lib/db/queries/ratings'
import { CateringReputationPanel } from '@/components/reputation/CateringReputationPanel'

export default async function AdminCateringReputationPage({
  params,
}: {
  params: Promise<{ cateringId: string }>
}) {
  const { cateringId } = await params

  const [tenant, reputation, dishTable, byCompany, comments] = await Promise.all([
    prisma.tenant.findFirst({
      where: { id: cateringId, type: 'CATERING' },
      select: { name: true },
    }),
    getCateringReputation(cateringId),
    getCateringDishTable(cateringId),
    getCateringReputationByCompany(cateringId),
    getCateringComments(cateringId, 20),
  ])

  if (!tenant) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/reputation">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Reputación
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{tenant.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Reputación del catering: platos, tendencia, valoración por empresa y
          comentarios. Entra en un plato para leer todos sus comentarios.
        </p>
      </div>

      <CateringReputationPanel
        summary={reputation}
        trend={reputation.trend}
        byCompany={byCompany}
        dishes={dishTable}
        comments={comments}
        dishHrefBase={`/admin/reputation/${cateringId}/plato`}
      />
    </div>
  )
}
