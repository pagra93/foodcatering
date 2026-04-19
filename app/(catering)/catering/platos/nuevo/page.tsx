/**
 * Página: Crear Nuevo Plato
 * Ruta: /catering/platos/nuevo
 *
 * Server Component: valida la sesión y el tipo de tenant, y monta el
 * formulario cliente (`DishCreateForm`) que ejecuta la Server Action
 * `createDishAction`.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getRequiredSession } from '@/lib/auth/session'
import { DishCreateForm } from '@/components/catering/platos/DishCreateForm'

export default async function NuevoPlatoPage() {
  const session = await getRequiredSession()

  if (session.user.tenantType !== 'CATERING') {
    redirect('/unauthorized')
  }

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
        <span className="text-gray-900">Nuevo plato</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Plato</h1>
        <p className="text-gray-600 mt-1">
          Añade un nuevo plato al catálogo del catering
        </p>
      </div>

      {/* Formulario */}
      <DishCreateForm />
    </div>
  )
}
