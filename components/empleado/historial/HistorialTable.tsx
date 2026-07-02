/**
 * Tabla de Historial de Pedidos
 * Vista simple de pedidos anteriores
 */

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Star,
} from 'lucide-react'
import { dishesFromSelection } from '@/lib/ratings/selection'
import { RateMealDialog } from '@/components/empleado/rating/RateMealDialog'

type HistorialOrder = {
  id: string
  serviceDate: Date
  menuType: string
  status: string
  price: number
  selection: any
  createdAt: Date
  ratedCount: number
  avgRating: number | null
}

type HistorialTableProps = {
  orders: HistorialOrder[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function RatingCell({
  order,
  onRate,
}: {
  order: HistorialOrder
  onRate: (o: HistorialOrder) => void
}) {
  if (order.status !== 'DELIVERED') {
    return <span className="text-xs text-gray-400">—</span>
  }
  if (order.ratedCount > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-500">
        <Star className="h-3.5 w-3.5 fill-amber-400" />
        <span className="text-xs font-medium text-gray-700">
          {order.avgRating}
        </span>
      </span>
    )
  }
  return (
    <Button variant="outline" size="sm" onClick={() => onRate(order)}>
      <Star className="mr-1 h-3.5 w-3.5" />
      Valorar
    </Button>
  )
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  CONFIRMED: {
    label: 'Confirmado',
    color: 'bg-primary/10 text-primary',
    icon: Clock,
  },
  LOCKED_AFTER_CUTOFF: {
    label: 'Bloqueado',
    color: 'bg-gray-100 text-gray-700',
    icon: Clock,
  },
  DELIVERED: {
    label: 'Entregado',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  CANCELLED_BEFORE_CUTOFF: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
  CANCELLED_AFTER_CUTOFF: {
    label: 'Cancelado (tras cutoff)',
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
  NO_SHOW: {
    label: 'No recogido',
    color: 'bg-yellow-100 text-yellow-700',
    icon: AlertCircle,
  },
}

export function HistorialTable({ orders, pagination }: HistorialTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [rating, setRating] = useState<HistorialOrder | null>(null)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/empleado/historial?${params.toString()}`)
  }

  if (orders.length === 0) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay pedidos
        </h3>
        <p className="text-gray-600">
          {searchParams.toString()
            ? 'No se encontraron pedidos con los filtros aplicados'
            : 'Aún no has realizado ningún pedido'}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabla (Desktop) */}
      <Card className="hidden md:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Valoración</TableHead>
              <TableHead className="text-right">Importe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const statusConfig =
                STATUS_CONFIG[order.status] ?? STATUS_CONFIG['CONFIRMED']
              const StatusIcon = statusConfig?.icon ?? Clock

              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">
                        {format(new Date(order.serviceDate), "EEEE, d 'de' MMMM", {
                          locale: es,
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        Pedido: {format(new Date(order.createdAt), 'HH:mm', {
                          locale: es,
                        })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {order.menuType || 'Diario'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusConfig?.color ?? ''} text-xs`}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusConfig?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RatingCell order={order} onRate={setRating} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-gray-900">
                      {order.price.toFixed(2)}€
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Cards (Mobile) */}
      <div className="md:hidden space-y-3">
        {orders.map((order) => {
          const statusConfig =
            STATUS_CONFIG[order.status] ?? STATUS_CONFIG['CONFIRMED']
          const StatusIcon = statusConfig?.icon ?? Clock

          return (
            <Card key={order.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {format(new Date(order.serviceDate), "EEEE, d 'de' MMMM", {
                      locale: es,
                    })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pedido: {format(new Date(order.createdAt), 'HH:mm')}
                  </p>
                </div>
                <Badge className={`${statusConfig?.color ?? ''} text-xs`}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {statusConfig?.label}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <Badge variant="outline" className="text-xs">
                  {order.menuType || 'Diario'}
                </Badge>
                <span className="text-lg font-bold text-gray-900">
                  {order.price.toFixed(2)}€
                </span>
              </div>

              <div className="mt-3 flex items-center justify-end">
                <RatingCell order={order} onRate={setRating} />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {(pagination.page - 1) * pagination.limit + 1} -{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
              {pagination.total} pedidos
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm font-medium text-gray-900 px-2">
                Página {pagination.page} de {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {rating && (
        <RateMealDialog
          open={!!rating}
          onOpenChange={(o) => !o && setRating(null)}
          orderId={rating.id}
          serviceDate={rating.serviceDate}
          dishes={dishesFromSelection(rating.selection)}
        />
      )}
    </div>
  )
}

