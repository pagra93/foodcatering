/**
 * Wrapper cliente para crear platos.
 *
 * Monta `DishForm` y ejecuta `createDishAction` al enviar. El submit se
 * encapsula aquí para mantener el formulario reutilizable y que la página
 * (`/catering/platos/nuevo`) pueda seguir siendo un Server Component puro.
 */

'use client'

import { useRouter } from 'next/navigation'
import { DishForm } from '@/components/catering/platos/DishForm'
import type {
  AllergenOption,
  CreateDishInput,
  UpdateDishInput,
} from '@/lib/validations/dish'
import { createDishAction } from './actions'

export function DishCreateForm({
  availableAllergens,
}: {
  availableAllergens: AllergenOption[]
}) {
  const router = useRouter()

  const handleSubmit = async (data: CreateDishInput | UpdateDishInput) => {
    const res = await createDishAction(data as CreateDishInput)
    if (!res.success) {
      throw new Error(res.error)
    }
  }

  const handleCancel = () => {
    router.push('/catering/platos')
  }

  return (
    <DishForm
      mode="create"
      availableAllergens={availableAllergens}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}
