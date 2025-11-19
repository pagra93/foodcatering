/**
 * Vista Semanal de Menús
 * Layout en columnas (L M X J V)
 */

'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Clock,
  Lock,
  AlertCircle,
  XCircle,
  Utensils,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type WeekViewProps = {
  data: {
    employee: {
      name: string
      allergens: any[]
      dietPrefs: any[]
    }
    company: {
      name: string
      dailyLimit: number
    }
    catering: {
      name: string
    }
    week: {
      startDate: Date
      endDate: Date
      days: Array<{
        date: Date
        dayName: string
        dayNumber: string
        monthName: string
        status: 'PENDING' | 'CONFIRMED' | 'LOCKED' | 'CANCELLED' | 'DELIVERED'
        order: {
          id: string
          selection: any
          price: number
        } | null
        availableDishes: {
          starters: any[]
          mains: any[]
          desserts: any[]
        }
        isPastCutoff: boolean
        cutoffTime: string
      }>
    }
  }
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pendiente',
    icon: AlertCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  CONFIRMED: {
    label: 'Confirmado',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  LOCKED: {
    label: 'Bloqueado',
    icon: Lock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  CANCELLED: {
    label: 'Cancelado',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  DELIVERED: {
    label: 'Entregado',
    icon: CheckCircle2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
}

export function WeekView({ data }: WeekViewProps) {
  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Horario de selección
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Puedes elegir o modificar tu menú hasta las{' '}
              <span className="font-semibold">{data.week.days[0]?.cutoffTime || '11:00'}</span>{' '}
              del mismo día. Después el pedido se bloquea automáticamente.
            </p>
          </div>
        </div>
      </Card>

      {/* Week Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {data.week.days.map((day) => {
          const statusConfig = STATUS_CONFIG[day.status]
          const StatusIcon = statusConfig.icon
          const dateKey = format(day.date, 'yyyy-MM-dd')

          // Imagen placeholder si no hay pedido
          const hasOrder = day.order !== null
          const hasAvailableDishes =
            day.availableDishes.starters.length > 0 ||
            day.availableDishes.mains.length > 0 ||
            day.availableDishes.desserts.length > 0

          return (
            <Link
              key={dateKey}
              href={`/empleado/menus/${dateKey}`}
              className="block group"
            >
              <Card
                className={cn(
                  'overflow-hidden transition-all hover:shadow-md',
                  statusConfig.borderColor
                )}
              >
                {/* Header */}
                <div className={cn('p-3', statusConfig.bgColor)}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">
                        {day.dayName}
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {day.dayNumber}
                      </p>
                    </div>
                    <StatusIcon className={cn('h-5 w-5', statusConfig.color)} />
                  </div>
                </div>

                {/* Image/Placeholder */}
                <div className="relative h-32 bg-gray-100">
                  {hasOrder && day.order?.selection ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                      <Utensils className="h-12 w-12 text-blue-600" />
                    </div>
                  ) : hasAvailableDishes ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                      <Utensils className="h-12 w-12 text-gray-400" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <p className="text-xs text-gray-400 text-center px-2">
                        Sin menú disponible
                      </p>
                    </div>
                  )}

                  {/* Badge de estado */}
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="secondary"
                      className={cn('text-xs', statusConfig.bgColor, statusConfig.color)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-3">
                  {hasOrder && day.order ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {day.order.price.toFixed(2)}€
                      </p>
                      <Button
                        variant={day.isPastCutoff ? 'outline' : 'default'}
                        size="sm"
                        className="w-full"
                      >
                        {day.isPastCutoff ? 'Ver menú' : 'Editar'}
                      </Button>
                    </div>
                  ) : hasAvailableDishes ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      disabled={day.isPastCutoff}
                    >
                      {day.isPastCutoff ? 'Cutoff pasado' : 'Elegir menú'}
                    </Button>
                  ) : (
                    <p className="text-xs text-center text-gray-500">
                      No disponible
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Info Footer */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <p className="text-sm text-gray-600">Catering</p>
          <p className="text-sm font-semibold text-gray-900">
            {data.catering.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Límite diario</p>
          <p className="text-sm font-semibold text-gray-900">
            {data.company.dailyLimit.toFixed(2)}€
          </p>
        </div>
      </div>
    </div>
  )
}

