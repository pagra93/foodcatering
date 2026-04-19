'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  FileText,
  Star,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Prisma } from '@prisma/client'

type CateringInfoTabProps = {
  restaurant: {
    id: string
    tenantId: string
    displayName: string
    legalName: string
    cif: string
    billingAddress: string
    contactPerson: string
    contactEmail: string
    contactPhone: string
    dailyCapacity: number
    cutoffTime: string
    preparationWindow: string | null
    deliveryWindow: string | null
    zones: Prisma.JsonValue
  }
  assignment: {
    id: string
    type: string
    zones: Prisma.JsonValue
    priority: number
    assignedAt: Date
  }
  metrics: {
    totalOrders: number
    deliveredOnTime: number
    punctualityRate: number
    incidents: number
    incidentRate: number
    avgRating: number | null
    slaPunctuality: Prisma.Decimal | number | null
    slaIncidentRate: Prisma.Decimal | number | null
  }
}

export function CateringInfoTab({
  restaurant,
  assignment,
  metrics,
}: CateringInfoTabProps) {
  // Normalizar los valores SLA (Decimal -> number)
  const slaPunctualityValue =
    metrics.slaPunctuality !== null && metrics.slaPunctuality !== undefined
      ? Number(metrics.slaPunctuality)
      : null
  const slaIncidentRateValue =
    metrics.slaIncidentRate !== null && metrics.slaIncidentRate !== undefined
      ? Number(metrics.slaIncidentRate)
      : null

  // Calcular cumplimiento de SLA
  const punctualityCompliance = slaPunctualityValue
    ? (metrics.punctualityRate / slaPunctualityValue) * 100
    : 0
  const incidentCompliance = slaIncidentRateValue
    ? 100 - (metrics.incidentRate / slaIncidentRateValue) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Header con logo y datos básicos */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-gray-100">
            <Building2 className="h-12 w-12 text-gray-400" />
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {restaurant.displayName || restaurant.legalName}
                </h2>
                {restaurant.displayName !== restaurant.legalName && (
                  <p className="text-sm text-gray-600 mt-1">{restaurant.legalName}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">CIF: {restaurant.cif}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {restaurant.contactPhone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{restaurant.contactPhone}</span>
                </div>
              )}
              {restaurant.contactEmail && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{restaurant.contactEmail}</span>
                </div>
              )}
              {restaurant.contactPerson && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{restaurant.contactPerson}</span>
                </div>
              )}
              {restaurant.billingAddress && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{restaurant.billingAddress}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Métricas de SLA */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Puntualidad</p>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {metrics.punctualityRate.toFixed(1)}%
          </p>
          <Progress value={punctualityCompliance} className="mt-2" />
          <p className="text-xs text-gray-500 mt-1">
            Objetivo: {slaPunctualityValue ?? '-'}%
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Tasa de Incidencias</p>
            <AlertCircle className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {metrics.incidentRate.toFixed(1)}%
          </p>
          <Progress value={incidentCompliance} className="mt-2" />
          <p className="text-xs text-gray-500 mt-1">
            Máximo: {slaIncidentRateValue ?? '-'}%
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Valoración Media</p>
            <Star className="h-5 w-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {metrics.avgRating ? metrics.avgRating.toFixed(1) : '-'}
            {metrics.avgRating && <span className="text-sm text-gray-500">/5</span>}
          </p>
          <p className="text-xs text-gray-500 mt-1">Últimos 30 días</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Pedidos Servidos</p>
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.totalOrders}</p>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.deliveredOnTime} entregados
          </p>
        </Card>
      </div>

      {/* Capacidad y Horarios */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            Capacidad y Horarios
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Capacidad Diaria</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {restaurant.dailyCapacity} menús/día
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Hora de Cutoff</p>
                <p className="text-base text-gray-900 mt-1">{restaurant.cutoffTime}</p>
              </div>
              {restaurant.preparationWindow && (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Ventana de Preparación
                  </p>
                  <p className="text-base text-gray-900 mt-1">
                    {restaurant.preparationWindow}
                  </p>
                </div>
              )}
            </div>

            {restaurant.deliveryWindow && (
              <div>
                <p className="text-sm font-medium text-gray-700">Ventana de Entrega</p>
                <p className="text-base text-gray-900 mt-1">
                  {restaurant.deliveryWindow}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Contacto Principal */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Contacto
          </h3>
          <div className="space-y-3">
            <div className="flex items-start justify-between p-3 rounded-lg border">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Persona de contacto</p>
                <p className="text-sm text-gray-600 mt-1">
                  {restaurant.contactPerson || 'No disponible'}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>

            <div className="flex items-start justify-between p-3 rounded-lg border">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-600 mt-1">
                  {restaurant.contactEmail || 'No disponible'}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>

            <div className="flex items-start justify-between p-3 rounded-lg border">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Teléfono</p>
                <p className="text-sm text-gray-600 mt-1">
                  {restaurant.contactPhone || 'No disponible'}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Información de Asignación */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Detalles de Asignación</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Tipo de Asignación</p>
            <Badge variant="default" className="mt-1">
              {assignment.type}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Prioridad</p>
            <p className="text-base text-gray-900 mt-1">{assignment.priority}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Fecha de Asignación</p>
            <p className="text-base text-gray-900 mt-1">
              {format(new Date(assignment.assignedAt), "d 'de' MMMM, yyyy", {
                locale: es,
              })}
            </p>
          </div>
        </div>

        {assignment.zones && Array.isArray(assignment.zones) && assignment.zones.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Zonas de Servicio
            </p>
            <div className="flex flex-wrap gap-2">
              {(assignment.zones as unknown[]).map((zone, index) => {
                const label =
                  typeof zone === 'string'
                    ? zone
                    : zone && typeof zone === 'object' && 'name' in zone && typeof (zone as { name?: unknown }).name === 'string'
                    ? ((zone as { name: string }).name)
                    : 'Zona sin nombre'
                return (
                  <Badge key={index} variant="outline">
                    {label}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

