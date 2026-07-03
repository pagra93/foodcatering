import { notFound, redirect } from 'next/navigation'
import { getRequiredSession } from '@/lib/auth/session'
import { getCateringDishDetail } from '@/lib/db/queries/ratings'
import { DishReputationDetail } from '@/components/reputation/DishReputationDetail'

export default async function CateringDishReputationPage({
  params,
}: {
  params: Promise<{ dishId: string }>
}) {
  const session = await getRequiredSession()
  if (session.user.tenantType !== 'CATERING') redirect('/unauthorized')

  const { dishId } = await params
  const detail = await getCateringDishDetail(session.user.tenantId, dishId)
  if (!detail) notFound()

  return <DishReputationDetail detail={detail} backHref="/catering/calidad" />
}
