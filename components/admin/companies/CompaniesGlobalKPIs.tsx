'use client'

/**
 * Componente: KPIs Globales de Empresas
 * Muestra métricas clave de todas las empresas en tarjetas
 * Usa: shadcn/ui Card, Badge
 */

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Users, 
  ShoppingCart, 
  AlertCircle, 
  TrendingUp,
  Euro,
} from 'lucide-react'

type GlobalKPIs = {
  companies: {
    total: number
    active: number
    suspended: number
    withIssues: number
  }
  employees: {
    total: number
    active: number
    adoptionRate: number // %
  }
  orders: {
    today: number
    thisMonth: number
    last30Days: number
    avgPerDay: number
  }
  incidents: {
    open: number
    last30Days: number
    rate: number // %
  }
  financial: {
    monthlySpend: number
    avgTicket: number
  }
}

type Props = {
  kpis: GlobalKPIs
}

export function CompaniesGlobalKPIs({ kpis }: Props) {
  // Helper para determinar color del badge según porcentaje
  const getAdoptionBadge = (rate: number) => {
    if (rate >= 70) return { variant: 'success' as const, label: 'Excelente' }
    if (rate >= 50) return { variant: 'default' as const, label: 'Buena' }
    if (rate >= 30) return { variant: 'secondary' as const, label: 'Regular' }
    return { variant: 'destructive' as const, label: 'Baja' }
  }

  const getIncidentBadge = (rate: number) => {
    if (rate < 2) return { variant: 'success' as const, label: '< 2%' }
    if (rate < 5) return { variant: 'secondary' as const, label: '< 5%' }
    return { variant: 'destructive' as const, label: `${rate.toFixed(1)}%` }
  }

  const adoptionBadge = getAdoptionBadge(kpis.employees.adoptionRate)
  const incidentBadge = getIncidentBadge(kpis.incidents.rate)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* 1. Empresas */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Empresas</span>
          </div>
          {kpis.companies.withIssues > 0 && (
            <Badge variant="destructive" className="text-xs">
              {kpis.companies.withIssues} con alertas
            </Badge>
          )}
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-gray-900">
            {kpis.companies.active}
          </div>
          <p className="text-xs text-gray-500">
            de {kpis.companies.total} activas
            {kpis.companies.suspended > 0 && ` • ${kpis.companies.suspended} suspendidas`}
          </p>
        </div>
      </Card>

      {/* 2. Empleados */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-green-100 p-2">
              <Users className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Empleados</span>
          </div>
          <Badge variant={adoptionBadge.variant} className="text-xs">
            {adoptionBadge.label}
          </Badge>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-gray-900">
            {kpis.employees.active.toLocaleString()}
          </div>
          <p className="text-xs text-gray-500">
            de {kpis.employees.total.toLocaleString()} registrados • {kpis.employees.adoptionRate}% activos
          </p>
        </div>
      </Card>

      {/* 3. Pedidos Hoy */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-100 p-2">
              <ShoppingCart className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Hoy</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            ø {kpis.orders.avgPerDay}/día
          </Badge>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-gray-900">
            {kpis.orders.today}
          </div>
          <p className="text-xs text-gray-500">
            {kpis.orders.thisMonth.toLocaleString()} este mes
          </p>
        </div>
      </Card>

      {/* 4. Incidencias */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg p-2 ${
              kpis.incidents.open > 10 ? 'bg-red-100' : 'bg-orange-100'
            }`}>
              <AlertCircle className={`h-4 w-4 ${
                kpis.incidents.open > 10 ? 'text-red-600' : 'text-orange-600'
              }`} />
            </div>
            <span className="text-sm font-medium text-gray-600">Incidencias</span>
          </div>
          <Badge variant={incidentBadge.variant} className="text-xs">
            {incidentBadge.label}
          </Badge>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-gray-900">
            {kpis.incidents.open}
          </div>
          <p className="text-xs text-gray-500">
            abiertas • {kpis.incidents.last30Days} últimos 30 días
          </p>
        </div>
      </Card>

      {/* 5. Facturación Mensual */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 p-2">
              <Euro className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Facturación</span>
          </div>
          <Badge variant="success" className="text-xs">
            Este mes
          </Badge>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-gray-900">
            {kpis.financial.monthlySpend.toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
          <p className="text-xs text-gray-500">
            Ticket medio: {kpis.financial.avgTicket.toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR',
            })}
          </p>
        </div>
      </Card>

      {/* 6. Tendencia */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-100 p-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Tendencia</span>
          </div>
          <Badge variant="success" className="text-xs">
            30 días
          </Badge>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-gray-900">
            {kpis.orders.last30Days.toLocaleString()}
          </div>
          <p className="text-xs text-gray-500">
            pedidos totales
          </p>
        </div>
      </Card>
    </div>
  )
}

