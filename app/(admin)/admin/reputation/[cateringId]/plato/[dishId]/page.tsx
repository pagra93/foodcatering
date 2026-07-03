import { notFound } from 'next/navigation'
import { getCateringDishDetail } from '@/lib/db/queries/ratings'
import { DishReputationDetail } from '@/components/reputation/DishReputationDetail'

export default async function AdminCateringDishReputationPage({
  params,
}: {
  params: Promise<{ cateringId: string; dishId: string }>
}) {
  const { cateringId, dishId } = await params
  const detail = await getCateringDishDetail(cateringId, dishId)
  if (!detail) notFound()

  return (
    <DishReputationDetail
      detail={detail}
      backHref={`/admin/reputation/${cateringId}`}
    />
  )
}
