/**
 * Página: Lista de Platos
 * Ruta: /catering/platos
 * 
 * Muestra tabla de platos con filtros, búsqueda y acciones CRUD
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DishesFilters } from '@/components/catering/platos/DishesFilters'
import { DishesTable } from '@/components/catering/platos/DishesTable'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function PlatosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [dishes, setDishes] = useState<any[]>([])
  const [pagination, setPagination] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Estado de filtros
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    course: searchParams.get('course') || 'all',
    active: searchParams.get('active') || 'all',
  })

  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))

  // Cargar platos
  const fetchDishes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (filters.search) params.append('search', filters.search)
      if (filters.course && filters.course !== 'all') params.append('course', filters.course)
      if (filters.active !== 'all') params.append('active', filters.active)
      params.append('page', page.toString())
      params.append('pageSize', '20')

      const response = await fetch(`/api/catering/platos?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setDishes(data.data.dishes)
        setPagination(data.data.pagination)
      } else {
        toast.error(data.error || 'Error al cargar platos')
      }
    } catch (error) {
      console.error('Error fetching dishes:', error)
      toast.error('Error al cargar platos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDishes()
  }, [filters, page])

  // Actualizar URL con filtros
  const updateURL = (newFilters: typeof filters) => {
    const params = new URLSearchParams()
    
    if (newFilters.search) params.append('search', newFilters.search)
    if (newFilters.course !== 'all') params.append('course', newFilters.course)
    if (newFilters.active !== 'all') params.append('active', newFilters.active)
    
    router.push(`/catering/platos?${params.toString()}`)
  }

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    setPage(1) // Reset a página 1
    updateURL(newFilters)
  }

  const handleReset = () => {
    const resetFilters = { search: '', course: 'all', active: 'all' }
    setFilters(resetFilters)
    setPage(1)
    router.push('/catering/platos')
  }

  // Eliminar plato
  const handleDelete = async (dishId: string) => {
    const response = await fetch(`/api/catering/platos/${dishId}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error)
    }

    // Recargar lista
    fetchDishes()
  }

  // Clonar plato
  const handleClone = async (dishId: string) => {
    const response = await fetch(`/api/catering/platos/${dishId}/clonar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error)
    }

    // Recargar lista
    fetchDishes()
  }

  // Activar/Desactivar plato
  const handleToggleActive = async (dishId: string, newActive: boolean) => {
    const response = await fetch(`/api/catering/platos/${dishId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: newActive }),
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error)
    }

    // Recargar lista
    fetchDishes()
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
      {!loading && pagination && (
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
              {pagination.page} / {pagination.totalPages}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">Resultados por página</p>
            <p className="text-2xl font-bold text-gray-900">{pagination.pageSize}</p>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card className="p-6">
        <DishesFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleReset}
        />
      </Card>

      {/* Tabla */}
      {loading ? (
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
      {!loading && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{' '}
            {pagination.total} platos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

