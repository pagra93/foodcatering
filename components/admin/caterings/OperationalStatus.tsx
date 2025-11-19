/**
 * Componente de Estado Operativo del Catering
 * Muestra configuración de horarios, capacidad y zonas de servicio
 */

'use client'

import { Clock, Utensils, MapPin, Calendar, Euro } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type RestaurantData = {
  displayName: string
  dailyCapacity: number
  cutoffTime: string
  preparationWindow: string | null
  deliveryWindow: string | null
  leadTimeMinutes: number
  operationalDays: any // JSON
  zones: any // JSON
  commission: any // Decimal
}

type OperationalStatusProps = {
  restaurant: RestaurantData
}

export function OperationalStatus({ restaurant }: OperationalStatusProps) {
  // Parsear días operativos
  let operationalDays: string[] = []
  try {
    operationalDays = Array.isArray(restaurant.operationalDays)
      ? restaurant.operationalDays
      : typeof restaurant.operationalDays === 'string'
      ? JSON.parse(restaurant.operationalDays)
      : []
  } catch (e) {
    console.error('Error parseando operationalDays:', e)
  }

  // Parsear zonas
  let zones: any[] = []
  try {
    zones = Array.isArray(restaurant.zones)
      ? restaurant.zones
      : typeof restaurant.zones === 'string'
      ? JSON.parse(restaurant.zones)
      : []
  } catch (e) {
    console.error('Error parseando zones:', e)
  }

  // Mapeo de días en español
  const dayLabels: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Estado Operativo</h2>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Horarios */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">Horarios</h3>
          </div>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-medium text-gray-500">⏰ Hora de Corte (Cutoff)</dt>
              <dd className="text-lg font-bold text-gray-900">
                {restaurant.cutoffTime}
              </dd>
              <p className="text-xs text-gray-500">
                Pedidos bloqueados después de esta hora
              </p>
            </div>
            {restaurant.preparationWindow && (
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  👨‍🍳 Ventana de Preparación
                </dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {restaurant.preparationWindow}
                </dd>
              </div>
            )}
            {restaurant.deliveryWindow && (
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  🚚 Ventana de Entrega
                </dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {restaurant.deliveryWindow}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium text-gray-500">
                ⏱️ Lead Time Mínimo
              </dt>
              <dd className="text-sm font-semibold text-gray-900">
                {restaurant.leadTimeMinutes} minutos
              </dd>
              <p className="text-xs text-gray-500">
                Tiempo mínimo antes del servicio
              </p>
            </div>
          </dl>
        </div>

        {/* Capacidad */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Utensils className="h-5 w-5 text-purple-600" />
            <h3 className="text-base font-semibold text-gray-900">Capacidad</h3>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">
              Capacidad Diaria Máxima
            </dt>
            <dd className="text-3xl font-bold text-gray-900 mt-2">
              {restaurant.dailyCapacity}
            </dd>
            <p className="text-sm text-gray-500 mt-1">platos por día</p>
          </div>
          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-800">
              <strong>💡 Nota:</strong> Las ventas se cierran automáticamente al
              alcanzar el 100% de la capacidad.
            </p>
          </div>
        </div>

        {/* Días Operativos */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-5 w-5 text-green-600" />
            <h3 className="text-base font-semibold text-gray-900">
              Días Operativos
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(dayLabels).map((day) => {
              const isActive = operationalDays.includes(day)
              return (
                <Badge
                  key={day}
                  variant={isActive ? 'default' : 'outline'}
                  className={
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'border-gray-300 text-gray-400'
                  }
                >
                  {dayLabels[day]}
                </Badge>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Días en los que el catering acepta pedidos
          </p>
        </div>

        {/* Zonas de Servicio */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="h-5 w-5 text-orange-600" />
            <h3 className="text-base font-semibold text-gray-900">
              Zonas de Servicio
            </h3>
          </div>
          {zones.length > 0 ? (
            <div className="space-y-2">
              {zones.map((zone: any, idx: number) => (
                <div key={idx} className="text-sm">
                  <span className="font-semibold text-gray-900">
                    {zone.name || `Zona ${idx + 1}`}
                  </span>
                  {zone.postalCodes && (
                    <p className="text-xs text-gray-500">
                      {zone.postalCodes.length} códigos postales
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No hay zonas configuradas aún
            </p>
          )}
        </div>

        {/* Económico */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Euro className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">
              Comisión
            </h3>
          </div>
          <div>
            <dd className="text-3xl font-bold text-gray-900 mt-2">
              {(Number(restaurant.commission) * 100).toFixed(2)}%
            </dd>
            <p className="text-sm text-gray-500 mt-1">
              Comisión por pedido
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

