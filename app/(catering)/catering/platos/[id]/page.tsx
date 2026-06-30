/**
 * Página: Editar Plato
 * Ruta: /catering/platos/[id]
 *
 * Server Component: carga el plato con `getDishById()` y delega la edición
 * al formulario cliente `DishEditForm`, que a su vez invoca la Server
 * Action `updateDishAction`.
 */

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { getRequiredSession } from '@/lib/auth/session'
import { getDishById } from '@/lib/db/queries/catering-dishes'
import { getActiveAllergenOptions } from '@/lib/db/queries/catalogs'
import { DishEditForm } from '@/components/catering/platos/DishEditForm'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditarPlatoPage({ params }: PageProps) {
  const session = await getRequiredSession()

  if (session.user.tenantType !== 'CATERING') {
    redirect('/unauthorized')
  }

  const { id } = await params
  const [dish, availableAllergens] = await Promise.all([
    getDishById(id, session.user.tenantId),
    getActiveAllergenOptions(),
  ])

  if (!dish) {
    notFound()
  }

  const publishedSchedulesCount = dish.schedules.length

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link
          href="/catering/platos"
          className="hover:text-gray-900 flex items-center"
        >
          <ChevronLeft className="h-4 w-4" />
          Platos
        </Link>
        <span>/</span>
        <span className="text-gray-900">{dish.name}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Editar Plato</h1>
        <p className="text-gray-600 mt-1">
          Modifica la información del plato{' '}
          <span className="font-semibold">{dish.name}</span>
        </p>
      </div>

      {/* Info adicional */}
      {publishedSchedulesCount > 0 && (
        <Card className="p-4 bg-primary/10 border-primary/30">
          <p className="text-sm text-primary">
            Este plato está en{' '}
            <span className="font-semibold">{publishedSchedulesCount}</span>{' '}
            menú(s) publicado(s). Los cambios no afectarán a los menús ya
            publicados.
          </p>
        </Card>
      )}

      {/* Formulario */}
      <DishEditForm
        availableAllergens={availableAllergens}
        dish={{
          id: dish.id,
          name: dish.name,
          course: dish.course,
          labels: dish.labels,
          allergenIds: dish.allergenIds,
          nutrition: dish.nutrition,
          basePrice: dish.basePrice,
          active: dish.active,
        }}
      />
    </div>
  )
}
