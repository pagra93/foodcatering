'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Calendar,
  MapPin,
  Utensils,
  Euro,
  Star,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type OrderDetailOverviewProps = {
  order: {
    id: string
    serviceDate: Date
    status: string
    price: number
    menuType: string
    selection: any
    createdAt: Date
    employee: {
      name: string
      email: string
      phone: string | null
      employeeNumber: string | null
      department: string | null
      site: {
        name: string
        address: string | null
        deliveryWindow: string | null
      }
    } | null
    rating: {
      rating: number
      comment: string | null
    } | null
    incidents: Array<{
      id: string
      type: string
      severity: string
      status: string
    }>
  }
}

const menuTypeMap = {
  FULL: 'Menú Completo',
  STARTER_MAIN: 'Primero + Segundo',
  MAIN_DESSERT: 'Segundo + Postre',
  MAIN_ONLY: 'Solo Segundo',
}

export function OrderDetailOverview({ order }: OrderDetailOverviewProps) {
  const menuTypeLabel = menuTypeMap[order.menuType as keyof typeof menuTypeMap] || order.menuType

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Información del Pedido */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Utensils className="h-5 w-5 text-gray-600" />
          Información del Pedido
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Fecha de Servicio</p>
            <p className="text-base text-gray-900 flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4 text-gray-500" />
              {format(new Date(order.serviceDate), "EEEE, d 'de' MMMM, yyyy", {
                locale: es,
              })}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">Tipo de Menú</p>
            <p className="text-base text-gray-900 mt-1">{menuTypeLabel}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">Importe</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
              <Euro className="h-6 w-6 text-green-600" />
              {order.price.toLocaleString('es-ES', {
                style: 'currency',
                currency: 'EUR',
              })}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">Fecha de Creación</p>
            <p className="text-sm text-gray-600 mt-1">
              {format(new Date(order.createdAt), "d/MM/yyyy 'a las' HH:mm", {
                locale: es,
              })}
            </p>
          </div>

          {/* Valoración */}
          {order.rating && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-600" />
                Valoración del Empleado
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {order.rating.rating}
                </span>
                <span className="text-sm text-gray-500">/ 5</span>
              </div>
              {order.rating.comment && (
                <p className="text-sm text-gray-600 mt-2 italic">
                  "{order.rating.comment}"
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Información del Empleado */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-gray-600" />
          Empleado y Ubicación
        </h3>
        {order.employee ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Nombre</p>
              <p className="text-base text-gray-900 mt-1">{order.employee.name}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Email</p>
              <p className="text-base text-gray-900 mt-1">{order.employee.email}</p>
            </div>

            {order.employee.phone && (
              <div>
                <p className="text-sm font-medium text-gray-700">Teléfono</p>
                <p className="text-base text-gray-900 mt-1">{order.employee.phone}</p>
              </div>
            )}

            {order.employee.employeeNumber && (
              <div>
                <p className="text-sm font-medium text-gray-700">Número de Empleado</p>
                <p className="text-base text-gray-900 mt-1">
                  #{order.employee.employeeNumber}
                </p>
              </div>
            )}

            {order.employee.department && (
              <div>
                <p className="text-sm font-medium text-gray-700">Departamento</p>
                <p className="text-base text-gray-900 mt-1">
                  {order.employee.department}
                </p>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                Sede de Entrega
              </p>
              <p className="text-base text-gray-900">{order.employee.site.name}</p>
              {order.employee.site.address && (
                <p className="text-sm text-gray-600 mt-1">
                  {order.employee.site.address}
                </p>
              )}
              {order.employee.site.deliveryWindow && (
                <p className="text-sm text-gray-600 mt-1">
                  Ventana de entrega: {order.employee.site.deliveryWindow}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Información de empleado no disponible</p>
        )}

        {/* Incidencias */}
        {order.incidents.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Incidencias Reportadas
            </p>
            <div className="space-y-2">
              {order.incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="p-3 rounded-lg border border-red-200 bg-red-50"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {incident.type}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="warning">{incident.severity}</Badge>
                    <Badge variant="outline">{incident.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

