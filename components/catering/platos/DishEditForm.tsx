/**
 * Wrapper cliente para editar platos.
 *
 * Recibe el plato ya cargado desde el Server Component padre
 * (`/catering/platos/[id]`) y ejecuta `updateDishAction` en el submit.
 */

'use client'

import { useRouter } from 'next/navigation'
import { DishForm } from '@/components/catering/platos/DishForm'
import type {
  AllergenOption,
  CreateDishInput,
  UpdateDishInput,
} from '@/lib/validations/dish'
import { updateDishAction } from './actions'

type DishEditFormProps = {
  availableAllergens: AllergenOption[]
  dish: {
    id: string
    name: string
    course: string
    ingredients?: string
    labels: string[]
    allergenIds: string[]
    nutrition: object
    basePrice: number
    active: boolean
  }
}

export function DishEditForm({ availableAllergens, dish }: DishEditFormProps) {
  const router = useRouter()

  const handleSubmit = async (data: CreateDishInput | UpdateDishInput) => {
    const res = await updateDishAction(dish.id, data as UpdateDishInput)
    if (!res.success) {
      throw new Error(res.error)
    }
  }

  const handleCancel = () => {
    router.push('/catering/platos')
  }

  return (
    <DishForm
      mode="edit"
      availableAllergens={availableAllergens}
      initialData={dish}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}
