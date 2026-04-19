/**
 * Página: Lista de Platos
 * Ruta: /catering/platos
 *
 * Server Component: carga los platos directamente con `getDishes()` y
 * delega la interactividad (filtros, paginación, acciones CRUD) a
 * `DishesView` (client component). Las mutaciones se ejecutan como
 * Server Actions definidas en `components/catering/platos/actions.ts`.
 */

import { redirect } from 'next/navigation'
import { getRequiredSession } from '@/lib/auth/session'
import { getDishes } from '@/lib/db/queries/catering-dishes'
import {
  dishFiltersSchema,
  type DishFilters,
} from '@/lib/validations/dish'
import { DishesView } from '@/components/catering/platos/DishesView'

type SearchParams = {
  search?: string
  course?: string
  active?: string
  page?: string
}

type PageProps = {
  searchParams: Promise<SearchParams>
}

function parseFilters(params: SearchParams): DishFilters {
  return dishFiltersSchema.parse({
    search: params.search || undefined,
    course: params.course && params.course !== 'all' ? params.course : undefined,
    active: params.active || 'all',
    page: params.page ? parseInt(params.page, 10) : 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })
}

export default async function PlatosPage({ searchParams }: PageProps) {
  const session = await getRequiredSession()

  if (session.user.tenantType !== 'CATERING') {
    redirect('/unauthorized')
  }

  const params = await searchParams
  const filters = parseFilters(params)
  const { dishes, pagination } = await getDishes(session.user.tenantId, filters)

  return (
    <DishesView
      dishes={dishes}
      pagination={pagination}
      filters={{
        search: params.search ?? '',
        course: params.course && params.course !== '' ? params.course : 'all',
        active: params.active ?? 'all',
      }}
    />
  )
}
