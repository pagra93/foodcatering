'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Edit, AlertCircle, CheckCircle2 } from 'lucide-react'

type DayMenu = {
  date: Date
  status: string
  firsts: any[]
  seconds: any[]
  desserts: any[]
}

type WeeklyMenuCalendarProps = {
  weekStart: Date
  menus: Record<string, DayMenu>
  onDateClick?: (date: Date) => void
}

export function WeeklyMenuCalendar({
  weekStart,
  menus,
  onDateClick: _onDateClick,
}: WeeklyMenuCalendarProps) {
  // Generar 7 días desde weekStart
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {days.map((date) => {
        const dateKey = format(date, 'yyyy-MM-dd')
        const menu = menus[dateKey]
        const hasMenu = menu && (menu.firsts.length > 0 || menu.seconds.length > 0)
        const isPublished = menu?.status === 'PUBLISHED'
        const isComplete = menu && menu.firsts.length > 0 && menu.seconds.length > 0

        return (
          <Card
            key={dateKey}
            className={`p-4 transition-all ${
              hasMenu ? 'border-orange-200 bg-orange-50/30' : ''
            }`}
          >
            {/* Header del día */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {format(date, 'EEEE', { locale: es })}
                </p>
                <p className="text-xs text-gray-500">
                  {format(date, 'dd MMM', { locale: es })}
                </p>
              </div>
              {isPublished ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Publicado
                </Badge>
              ) : hasMenu ? (
                <Badge variant="secondary">
                  Borrador
                </Badge>
              ) : (
                <Badge variant="outline">
                  Vacío
                </Badge>
              )}
            </div>

            {/* Contenido del menú */}
            {hasMenu ? (
              <div className="space-y-2 mb-3">
                {/* Primeros */}
                {menu.firsts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      Primeros ({menu.firsts.length})
                    </p>
                    <div className="space-y-1">
                      {menu.firsts.slice(0, 2).map((dish: any) => (
                        <p key={dish.dishId} className="text-xs text-gray-700 truncate">
                          • {dish.name}
                        </p>
                      ))}
                      {menu.firsts.length > 2 && (
                        <p className="text-xs text-gray-500">
                          +{menu.firsts.length - 2} más
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Segundos */}
                {menu.seconds.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      Segundos ({menu.seconds.length})
                    </p>
                    <div className="space-y-1">
                      {menu.seconds.slice(0, 2).map((dish: any) => (
                        <p key={dish.dishId} className="text-xs text-gray-700 truncate">
                          • {dish.name}
                        </p>
                      ))}
                      {menu.seconds.length > 2 && (
                        <p className="text-xs text-gray-500">
                          +{menu.seconds.length - 2} más
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Postres */}
                {menu.desserts && menu.desserts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      Postres ({menu.desserts.length})
                    </p>
                  </div>
                )}

                {/* Alerta si incompleto */}
                {!isComplete && (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <AlertCircle className="h-3 w-3" />
                    <p className="text-xs">Menú incompleto</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Sin menú asignado</p>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2">
              <Link href={`/catering/menus/dia/${dateKey}`} className="flex-1">
                <Button
                  variant={hasMenu ? 'outline' : 'default'}
                  size="sm"
                  className="w-full"
                >
                  {hasMenu ? (
                    <>
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </>
                  ) : (
                    <>
                      <Edit className="h-3 w-3 mr-1" />
                      Crear
                    </>
                  )}
                </Button>
              </Link>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

