'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Building2,
  Mail,
  Phone,
  Globe,
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

type CateringInfoTabProps = {
  restaurant: {
    id: string
    legalName: string
    tradeName: string | null
    cif: string
    address: string | null
    city: string | null
    phone: string | null
    email: string | null
    website: string | null
    logoUrl: string | null
    sanitaryRegistration: string | null
    sanitaryRegistrationExpiry: Date | null
    rcInsurance: string | null
    rcInsuranceExpiry: Date | null
    dailyCapacity: number
    cutoffTime: string
    preparationWindow: string | null
    deliveryWindow: string | null
    serviceZones: any
    commissionRate: number
    status: string
  }
  assignment: {
    id: string
    type: string
    zones: any
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
    slaPunctuality: number
    slaIncidentRate: number
  }
}

export function CateringInfoTab({
  restaurant,
  assignment,
  metrics,
}: CateringInfoTabProps) {
  const statusMap = {
    ACTIVE: { label: 'Activo', variant: 'success' as const },
    SUSPENDED: { label: 'Suspendido', variant: 'destructive' as const },
    UNDER_REVIEW: { label: 'En Revisión', variant: 'warning' as const },
  }

  const statusInfo = statusMap[restaurant.status as keyof typeof statusMap] || {
    label: restaurant.status,
    variant: 'outline' as const,
  }

  // Verificar documentos próximos a caducar
  const checkDocExpiry = (expiryDate: Date | null) => {
    if (!expiryDate) return null
    const daysUntilExpiry = Math.floor(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysUntilExpiry < 0) return 'expired'
    if (daysUntilExpiry <= 30) return 'expiring'
    return 'valid'
  }

  const sanitaryStatus = checkDocExpiry(restaurant.sanitaryRegistrationExpiry)
  const rcStatus = checkDocExpiry(restaurant.rcInsuranceExpiry)

  // Calcular cumplimiento de SLA
  const punctualityCompliance = restaurant.slaPunctuality
    ? (metrics.punctualityRate / restaurant.slaPunctuality) * 100
    : 0
  const incidentCompliance = restaurant.slaIncidentRate
    ? 100 - (metrics.incidentRate / restaurant.slaIncidentRate) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Header con logo y datos básicos */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          {restaurant.logoUrl ? (
            <img
              src={restaurant.logoUrl}
              alt={restaurant.tradeName || restaurant.legalName}
              className="h-24 w-24 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-gray-100">
              <Building2 className="h-12 w-12 text-gray-400" />
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {restaurant.tradeName || restaurant.legalName}
                </h2>
                {restaurant.tradeName && (
                  <p className="text-sm text-gray-600 mt-1">{restaurant.legalName}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">CIF: {restaurant.cif}</p>
              </div>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {restaurant.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{restaurant.phone}</span>
                </div>
              )}
              {restaurant.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{restaurant.email}</span>
                </div>
              )}
              {restaurant.website && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="h-4 w-4" />
                  <a
                    href={restaurant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600"
                  >
                    Sitio web
                  </a>
                </div>
              )}
              {restaurant.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{restaurant.city}</span>
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
            Objetivo: {metrics.slaPunctuality}%
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
            Máximo: {metrics.slaIncidentRate}%
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

        {/* Documentación */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Documentación
          </h3>
          <div className="space-y-3">
            {/* Registro Sanitario */}
            <div className="flex items-start justify-between p-3 rounded-lg border">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Registro Sanitario</p>
                <p className="text-sm text-gray-600 mt-1">
                  {restaurant.sanitaryRegistration || 'No disponible'}
                </p>
                {restaurant.sanitaryRegistrationExpiry && (
                  <p className="text-xs text-gray-500 mt-1">
                    Caduca:{' '}
                    {format(
                      new Date(restaurant.sanitaryRegistrationExpiry),
                      "d 'de' MMMM, yyyy",
                      { locale: es }
                    )}
                  </p>
                )}
              </div>
              {sanitaryStatus === 'valid' && (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              {sanitaryStatus === 'expiring' && (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              {sanitaryStatus === 'expired' && (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>

            {/* Seguro RC */}
            <div className="flex items-start justify-between p-3 rounded-lg border">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Seguro RC</p>
                <p className="text-sm text-gray-600 mt-1">
                  {restaurant.rcInsurance || 'No disponible'}
                </p>
                {restaurant.rcInsuranceExpiry && (
                  <p className="text-xs text-gray-500 mt-1">
                    Caduca:{' '}
                    {format(
                      new Date(restaurant.rcInsuranceExpiry),
                      "d 'de' MMMM, yyyy",
                      { locale: es }
                    )}
                  </p>
                )}
              </div>
              {rcStatus === 'valid' && (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              {rcStatus === 'expiring' && (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              {rcStatus === 'expired' && (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
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
              {assignment.zones.map((zone: any, index: number) => (
                <Badge key={index} variant="outline">
                  {typeof zone === 'string' ? zone : zone.name || 'Zona sin nombre'}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

