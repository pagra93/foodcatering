'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  User,
  MapPin,
  Calendar,
  Utensils,
  Euro,
  Star,
  TrendingUp,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type EmployeeOverviewProps = {
  employee: {
    id: string
    name: string
    email: string
    phone: string | null
    employeeNumber: string | null
    department: string | null
    position: string | null
    startDate: Date | null
    endDate: Date | null
    status: string
    weeklyMenuDays: number | null
    monthlyLimit: number | null
    notes: string | null
    site: {
      id: string
      name: string
      address: string | null
      city: string | null
      postalCode: string | null
    }
    metrics: {
      ordersTotal: number
      ordersLast30Days: number
      ordersThisMonth: number
      totalSpent: number
      avgTicket: number
      avgRating: number | null
    }
  }
}

export function EmployeeOverview({ employee }: EmployeeOverviewProps) {
  return (
    <div className="space-y-6">
      {/* KPIs del empleado */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pedidos Totales
            </CardTitle>
            <Utensils className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employee.metrics.ordersTotal}</div>
            <p className="text-xs text-gray-500 mt-1">
              {employee.metrics.ordersLast30Days} últimos 30 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Gasto Total
            </CardTitle>
            <Euro className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employee.metrics.totalSpent.toLocaleString('es-ES', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">Histórico</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ticket Medio
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employee.metrics.avgTicket.toLocaleString('es-ES', {
                style: 'currency',
                currency: 'EUR',
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">Por pedido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Valoración
            </CardTitle>
            <Star className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employee.metrics.avgRating
                ? employee.metrics.avgRating.toFixed(1)
                : '-'}
              {employee.metrics.avgRating && (
                <span className="text-sm text-gray-500">/5</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {employee.metrics.avgRating ? 'Promedio' : 'Sin valoraciones'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Información personal */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-gray-600" />
          Información Personal
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-700">Email</p>
            <p className="text-base text-gray-900">{employee.email}</p>
          </div>
          {employee.phone && (
            <div>
              <p className="text-sm font-medium text-gray-700">Teléfono</p>
              <p className="text-base text-gray-900">{employee.phone}</p>
            </div>
          )}
          {employee.department && (
            <div>
              <p className="text-sm font-medium text-gray-700">Departamento</p>
              <p className="text-base text-gray-900">{employee.department}</p>
            </div>
          )}
          {employee.position && (
            <div>
              <p className="text-sm font-medium text-gray-700">Cargo</p>
              <p className="text-base text-gray-900">{employee.position}</p>
            </div>
          )}
          {employee.startDate && (
            <div>
              <p className="text-sm font-medium text-gray-700">Fecha de Alta</p>
              <p className="text-base text-gray-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                {format(new Date(employee.startDate), "d 'de' MMMM, yyyy", {
                  locale: es,
                })}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Ubicación */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-gray-600" />
          Ubicación y Sede
        </h3>
        <div>
          <p className="text-base font-medium text-gray-900">
            {employee.site.name}
          </p>
          {employee.site.address && (
            <p className="text-sm text-gray-600 mt-1">{employee.site.address}</p>
          )}
          {employee.site.city && employee.site.postalCode && (
            <p className="text-sm text-gray-600">
              {employee.site.postalCode}, {employee.site.city}
            </p>
          )}
        </div>
      </Card>

      {/* Configuración del beneficio */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Utensils className="h-5 w-5 text-gray-600" />
          Configuración del Beneficio
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-700">
              Días de Menú por Semana
            </p>
            <p className="text-base text-gray-900">
              {employee.weeklyMenuDays || 4} días
            </p>
          </div>
          {employee.monthlyLimit && (
            <div>
              <p className="text-sm font-medium text-gray-700">Límite Mensual</p>
              <p className="text-base text-gray-900">
                {employee.monthlyLimit.toLocaleString('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Notas */}
      {employee.notes && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Notas Internas</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {employee.notes}
          </p>
        </Card>
      )}
    </div>
  )
}

