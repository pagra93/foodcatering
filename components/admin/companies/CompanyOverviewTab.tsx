'use client'

/**
 * Componente: Tab Overview de Empresa
 * Dashboard con KPIs, alertas, actividad reciente y resumen ejecutivo
 * Usa: shadcn/ui Card, Badge, Button, Alert, Table
 */

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ShoppingCart,
  Users,
  AlertTriangle,
  Euro,
  TrendingUp,
  TrendingDown,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  ChefHat,
} from 'lucide-react'

type Props = {
  company: any // TODO: Tipar correctamente
  kpis: {
    orders30Days: number
    orders90Days: number
    ordersThisMonth: number
    ordersDelivered30Days: number
    deliverySuccessRate: number
    avgOrdersPerDay: number
    totalEmployees: number
    activeEmployees30Days: number
    activeEmployees90Days: number
    adoptionRate30Days: number
    adoptionRate90Days: number
    incidentsOpen: number
    incidents30Days: number
    incidentRate: number
    totalSpend30Days: number
    totalSpendThisMonth: number
    avgTicket30Days: number
    avgTicketThisMonth: number
  }
  alerts: {
    deductibilityIssue: boolean
    lowAdoption: boolean
    highIncidents: boolean
    noOrders: boolean
    totalAlerts: number
  }
  catering: any | null
  recentOrders: any[]
  recentIncidents: any[]
}

export function CompanyOverviewTab({ 
  company, 
  kpis, 
  alerts, 
  catering, 
  recentOrders,
  recentIncidents 
}: Props) {
  // Helper: badge de adopción
  const getAdoptionBadge = (rate: number) => {
    if (rate >= 70) return { variant: 'success' as const, icon: TrendingUp, label: 'Excelente' }
    if (rate >= 50) return { variant: 'default' as const, icon: TrendingUp, label: 'Buena' }
    if (rate >= 30) return { variant: 'secondary' as const, icon: TrendingDown, label: 'Regular' }
    return { variant: 'destructive' as const, icon: TrendingDown, label: 'Baja' }
  }

  const adoptionBadge = getAdoptionBadge(kpis.adoptionRate30Days)
  const AdoptionIcon = adoptionBadge.icon

  // Helper: badge de incidencias
  const getIncidentBadge = (rate: number) => {
    if (rate < 2) return { variant: 'success' as const, label: 'Excelente' }
    if (rate < 5) return { variant: 'secondary' as const, label: 'Aceptable' }
    return { variant: 'destructive' as const, label: 'Crítico' }
  }

  const incidentBadge = getIncidentBadge(kpis.incidentRate)

  // Helper: badge de estado de pedido
  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge variant="success" className="text-xs">Entregado</Badge>
      case 'CONFIRMED':
        return <Badge variant="default" className="text-xs">Confirmado</Badge>
      case 'CANCELLED_BEFORE_CUTOFF':
        return <Badge variant="secondary" className="text-xs">Cancelado</Badge>
      default:
        return <Badge variant="default" className="text-xs">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {alerts.totalAlerts > 0 && (
        <div className="space-y-3">
          {alerts.deductibilityIssue && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Límite diario &gt; 11€:</strong> La empresa supera el límite fiscal de deducibilidad. 
                Revisar política de servicio.
              </AlertDescription>
            </Alert>
          )}
          {alerts.lowAdoption && (
            <Alert variant="default" className="border-orange-500 text-orange-700">
              <TrendingDown className="h-4 w-4" />
              <AlertDescription>
                <strong>Baja adopción:</strong> Menos del 50% de empleados están usando el servicio. 
                Considerar acciones de comunicación.
              </AlertDescription>
            </Alert>
          )}
          {alerts.highIncidents && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Incidencias elevadas:</strong> Más de 5 incidencias abiertas. 
                Revisar con catering asignado.
              </AlertDescription>
            </Alert>
          )}
          {alerts.noOrders && (
            <Alert variant="default" className="border-yellow-500 text-yellow-700">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Sin pedidos recientes:</strong> No hay pedidos en los últimos 30 días. 
                Verificar estado del servicio.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {alerts.totalAlerts === 0 && (
        <Alert variant="default" className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <strong>Todo en orden:</strong> No hay alertas activas para esta empresa.
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Pedidos */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Pedidos</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {kpis.orders30Days}
          </div>
          <p className="text-xs text-gray-500">
            últimos 30 días • ø {kpis.avgOrdersPerDay}/día
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Badge variant="success" className="text-xs">
              {kpis.deliverySuccessRate}% entregados
            </Badge>
          </div>
        </Card>

        {/* Empleados */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-lg bg-green-100 p-2">
              <Users className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Empleados</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {kpis.activeEmployees30Days}
          </div>
          <p className="text-xs text-gray-500">
            de {kpis.totalEmployees} activos últimos 30d
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={adoptionBadge.variant} className="text-xs flex items-center gap-1">
              <AdoptionIcon className="h-3 w-3" />
              {kpis.adoptionRate30Days}% {adoptionBadge.label}
            </Badge>
          </div>
        </Card>

        {/* Incidencias */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`rounded-lg p-2 ${
              kpis.incidentsOpen > 5 ? 'bg-red-100' : 'bg-orange-100'
            }`}>
              <AlertTriangle className={`h-4 w-4 ${
                kpis.incidentsOpen > 5 ? 'text-red-600' : 'text-orange-600'
              }`} />
            </div>
            <span className="text-sm font-medium text-gray-600">Incidencias</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {kpis.incidentsOpen}
          </div>
          <p className="text-xs text-gray-500">
            abiertas • {kpis.incidents30Days} últimos 30d
          </p>
          <div className="mt-2">
            <Badge variant={incidentBadge.variant} className="text-xs">
              {kpis.incidentRate.toFixed(2)}% tasa • {incidentBadge.label}
            </Badge>
          </div>
        </Card>

        {/* Gasto */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-lg bg-emerald-100 p-2">
              <Euro className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Gasto</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {kpis.totalSpendThisMonth.toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
          <p className="text-xs text-gray-500">
            este mes • ø {kpis.avgTicketThisMonth.toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR',
            })}/pedido
          </p>
          <p className="text-xs text-gray-500 mt-1">
            30d: {kpis.totalSpend30Days.toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
        </Card>
      </div>

      {/* Catering Asignado */}
      {catering && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-3">
                <ChefHat className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Catering Asignado</h3>
                <p className="text-sm text-gray-500">Proveedor principal de menús</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/caterings/${catering.id}`}>
                Ver detalle
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Nombre</p>
              <p className="text-base font-semibold text-gray-900">{catering.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Contacto</p>
              <p className="text-sm text-gray-900">{catering.contactEmail}</p>
              <p className="text-sm text-gray-500">{catering.contactPhone}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">SLAs Acordados</p>
              <div className="flex items-center gap-2">
                {catering.assignment?.slaPunctuality && (
                  <Badge variant="secondary" className="text-xs">
                    Puntualidad: {catering.assignment.slaPunctuality}%
                  </Badge>
                )}
                {catering.assignment?.slaIncidentRate && (
                  <Badge variant="secondary" className="text-xs">
                    Incidencias: &lt;{catering.assignment.slaIncidentRate}%
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Dos columnas: Pedidos Recientes + Incidencias Recientes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pedidos Recientes */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pedidos Recientes</h3>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/empresas/${company.id}/pedidos`}>
                Ver todos
              </Link>
            </Button>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No hay pedidos recientes
            </p>
          ) : (
            <div className="space-y-3">
              {recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Empleado #{order.employeeId.slice(-8)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(order.serviceDate), "d 'de' MMMM", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {order.price.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </span>
                    {getOrderStatusBadge(order.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Incidencias Recientes */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Incidencias Recientes</h3>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/empresas/${company.id}/incidencias`}>
                Ver todas
              </Link>
            </Button>
          </div>

          {recentIncidents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Sin incidencias en los últimos 30 días
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentIncidents.slice(0, 5).map((incident) => (
                <div key={incident.id} className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className={`rounded-full p-1 ${
                    incident.severity === 'HIGH' ? 'bg-red-100' :
                    incident.severity === 'MEDIUM' ? 'bg-orange-100' :
                    'bg-yellow-100'
                  }`}>
                    {incident.status === 'OPEN' ? (
                      <XCircle className={`h-3 w-3 ${
                        incident.severity === 'HIGH' ? 'text-red-600' :
                        incident.severity === 'MEDIUM' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`} />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {incident.type}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(incident.createdAt), "d 'de' MMM", { locale: es })}
                      {incident.order && ` • Pedido del ${format(new Date(incident.order.serviceDate), "d 'de' MMM", { locale: es })}`}
                    </p>
                  </div>
                  <Badge 
                    variant={incident.status === 'OPEN' ? 'destructive' : 'success'}
                    className="text-xs"
                  >
                    {incident.status === 'OPEN' ? 'Abierta' : 
                     incident.status === 'IN_PROGRESS' ? 'En proceso' :
                     'Resuelta'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

