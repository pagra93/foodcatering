/**
 * Vista cliente del listado de platos.
 *
 * Se monta encima de `DishesTable` y `DishesFilters` para aportar
 * interactividad (filtros locales, sincronización con la URL, llamadas a
 * las Server Actions para delete/clone/toggle). El fetch inicial ocurre en
 * el Server Component padre (`app/(catering)/catering/platos/page.tsx`),
 * así que esta vista sólo refresca datos cuando el usuario cambia la query
 * string o invoca una mutación.
 */

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DishesFilters } from '@/components/catering/platos/DishesFilters'
import { DishesTable } from '@/components/catering/platos/DishesTable'
import { Plus, Loader2 } from 'lucide-react'
import {
  cloneDishAction,
  deleteDishAction,
  toggleDishActiveAction,
} from './actions'

type DishItem = React.ComponentProps<typeof DishesTable>['dishes'][number]

type Pagination = {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type Filters = {
  search: string
  course: string
  active: string
}

type DishesViewProps = {
  dishes: DishItem[]
  pagination: Pagination
  filters: Filters
}

function buildQuery(filters: Filters, page: number): string {
  const params = new URLSearchParams()
  if (filters.search) params.append('search', filters.search)
  if (filters.course && filters.course !== 'all') {
    params.append('course', filters.course)
  }
  if (filters.active !== 'all') params.append('active', filters.active)
  if (page > 1) params.append('page', page.toString())
  return params.toString()
}

export function DishesView({ dishes, pagination, filters }: DishesViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localFilters, setLocalFilters] = useState<Filters>(filters)

  const navigate = (nextFilters: Filters, nextPage: number) => {
    const qs = buildQuery(nextFilters, nextPage)
    startTransition(() => {
      router.push(qs ? `/catering/platos?${qs}` : '/catering/platos')
    })
  }

  const handleFiltersChange = (newFilters: Filters) => {
    setLocalFilters(newFilters)
    navigate(newFilters, 1)
  }

  const handleReset = () => {
    const resetFilters: Filters = { search: '', course: 'all', active: 'all' }
    setLocalFilters(resetFilters)
    navigate(resetFilters, 1)
  }

  const handlePageChange = (nextPage: number) => {
    navigate(localFilters, nextPage)
  }

  const handleDelete = async (dishId: string) => {
    const res = await deleteDishAction(dishId)
    if (!res.success) {
      throw new Error(res.error)
    }
    router.refresh()
  }

  const handleClone = async (dishId: string) => {
    const res = await cloneDishAction(dishId)
    if (!res.success) {
      throw new Error(res.error)
    }
    router.refresh()
  }

  const handleToggleActive = async (dishId: string, newActive: boolean) => {
    const res = await toggleDishActiveAction(dishId, newActive)
    if (!res.success) {
      throw new Error(res.error)
    }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platos</h1>
          <p className="text-gray-600 mt-1">
            Gestiona el catálogo de platos del catering
          </p>
        </div>
        <Link href="/catering/platos/nuevo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo plato
          </Button>
        </Link>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total de platos</p>
          <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">En esta página</p>
          <p className="text-2xl font-bold text-gray-900">{dishes.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Página actual</p>
          <p className="text-2xl font-bold text-gray-900">
            {pagination.page} / {Math.max(pagination.totalPages, 1)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Resultados por página</p>
          <p className="text-2xl font-bold text-gray-900">{pagination.pageSize}</p>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-6">
        <DishesFilters
          filters={localFilters}
          onFiltersChange={handleFiltersChange}
          onReset={handleReset}
        />
      </Card>

      {/* Tabla */}
      {isPending ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <DishesTable
          dishes={dishes}
          onDelete={handleDelete}
          onClone={handleClone}
          onToggleActive={handleToggleActive}
        />
      )}

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
            {Math.min(
              pagination.page * pagination.pageSize,
              pagination.total
            )}{' '}
            de {pagination.total} platos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1 || isPending}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || isPending}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
