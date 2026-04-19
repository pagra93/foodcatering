'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, User } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type CateringRatingsTabProps = {
  tenantId: string
  cateringId: string
}

type Rating = {
  id: string
  rating: number
  tasteRating: number | null
  portionRating: number | null
  presentationRating: number | null
  comment: string | null
  createdAt: Date
  employee: {
    id: string
    name: string
    employeeNumber: string | null
  }
  order: {
    id: string
    serviceDate: Date
    menuType: string
  }
}

type RatingsData = {
  ratings: Rating[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export function CateringRatingsTab({
  tenantId,
  cateringId,
}: CateringRatingsTabProps) {
  const [data, setData] = useState<RatingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadRatings()
  }, [tenantId, cateringId, page])

  const loadRatings = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/empresa/catering/ratings?tenantId=${tenantId}&cateringId=${cateringId}&page=${page}`
      )
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error loading ratings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (!data || data.ratings.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-gray-500">
          <Star className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p>Aún no hay valoraciones de empleados</p>
          <p className="text-sm mt-2">
            Las valoraciones aparecerán aquí cuando los empleados evalúen sus pedidos
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Valoraciones de Empleados
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Total de {data.pagination.total} valoraciones
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Página</p>
            <p className="text-lg font-semibold text-gray-900">
              {data.pagination.page} de {data.pagination.totalPages}
            </p>
          </div>
        </div>
      </Card>

      {/* Lista de Valoraciones */}
      <div className="space-y-4">
        {data.ratings.map((rating) => (
          <RatingCard key={rating.id} rating={rating} />
        ))}
      </div>

      {/* Paginación */}
      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-600">
            Página {page} de {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === data.pagination.totalPages || loading}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}

function RatingCard({ rating }: { rating: Rating }) {
  const menuTypeMap: Record<string, string> = {
    FULL: 'Menú completo',
    STARTER_MAIN: '1º + 2º',
    MAIN_DESSERT: '2º + Postre',
    MAIN_ONLY: 'Solo 2º',
  }

  const menuTypeLabel = menuTypeMap[rating.order.menuType] || rating.order.menuType

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <User className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{rating.employee.name}</p>
            {rating.employee.employeeNumber && (
              <p className="text-sm text-gray-500">
                #{rating.employee.employeeNumber}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {format(new Date(rating.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                locale: es,
              })}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="text-lg font-bold text-gray-900">{rating.rating}</span>
            <span className="text-sm text-gray-500">/5</span>
          </div>
        </div>
      </div>

      {/* Información del Pedido */}
      <div className="mb-4 p-3 rounded-lg bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Pedido:</span>
          <Badge variant="outline">{menuTypeLabel}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-600">Fecha de servicio:</span>
          <span className="text-gray-900">
            {format(new Date(rating.order.serviceDate), "d 'de' MMMM, yyyy", {
              locale: es,
            })}
          </span>
        </div>
      </div>

      {/* Valoraciones Detalladas */}
      {(rating.tasteRating ||
        rating.portionRating ||
        rating.presentationRating) && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {rating.tasteRating && (
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Sabor</p>
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold text-gray-900">
                  {rating.tasteRating}
                </span>
              </div>
            </div>
          )}
          {rating.portionRating && (
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Cantidad</p>
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold text-gray-900">
                  {rating.portionRating}
                </span>
              </div>
            </div>
          )}
          {rating.presentationRating && (
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Presentación</p>
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold text-gray-900">
                  {rating.presentationRating}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comentario */}
      {rating.comment && (
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-700 italic">"{rating.comment}"</p>
        </div>
      )}
    </Card>
  )
}

