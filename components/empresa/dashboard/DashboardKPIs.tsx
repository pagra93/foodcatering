'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  Utensils,
  Euro,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DashboardKPIsProps = {
  data: {
    employees: {
      total: number
      active: number
      activeThisWeek: number
      adoptionRate: number
    }
    orders: {
      today: number
      thisWeek: number
      thisMonth: number
      last30Days: number
      avgPerDay: number
    }
    financial: {
      totalSpendThisMonth: number
      totalSpendLast30Days: number
      avgTicket: number
    }
    cancellations: {
      thisWeek: number
      rate: number
    }
    incidents: {
      open: number
    }
  }
}

export function DashboardKPIs({ data }: DashboardKPIsProps) {
  const kpis = [
    {
      title: 'Empleados Activos',
      value: `${data.employees.active}`,
      subtitle: `${data.employees.adoptionRate}% de adopción`,
      icon: Users,
      trend: data.employees.adoptionRate >= 70 ? 'up' : data.employees.adoptionRate >= 50 ? 'neutral' : 'down',
      trendLabel: `${data.employees.activeThisWeek} esta semana`,
    },
    {
      title: 'Pedidos Hoy',
      value: data.orders.today.toString(),
      subtitle: `${data.orders.avgPerDay} promedio/día`,
      icon: Utensils,
      trend: 'neutral',
      trendLabel: `${data.orders.thisMonth} este mes`,
    },
    {
      title: 'Gasto Mensual',
      value: `${data.financial.totalSpendThisMonth.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
      subtitle: `Ticket medio: ${data.financial.avgTicket.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
      })}`,
      icon: Euro,
      trend: 'neutral',
      trendLabel: 'Este mes',
    },
    {
      title: 'Cancelaciones',
      value: `${data.cancellations.rate.toFixed(1)}%`,
      subtitle: `${data.cancellations.thisWeek} esta semana`,
      icon: XCircle,
      trend: data.cancellations.rate <= 10 ? 'up' : data.cancellations.rate <= 20 ? 'neutral' : 'down',
      trendLabel: data.cancellations.rate <= 10 ? 'Bajo control' : 'Revisar',
    },
    {
      title: 'Incidencias Abiertas',
      value: data.incidents.open.toString(),
      subtitle: 'Pendientes de resolución',
      icon: AlertTriangle,
      trend: data.incidents.open === 0 ? 'up' : data.incidents.open <= 5 ? 'neutral' : 'down',
      trendLabel: data.incidents.open === 0 ? 'Sin incidencias' : 'Requiere atención',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        const TrendIcon =
          kpi.trend === 'up'
            ? TrendingUp
            : kpi.trend === 'down'
              ? TrendingDown
              : Minus

        return (
          <Card key={kpi.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {kpi.title}
              </CardTitle>
              <Icon className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
              <p className="text-xs text-gray-500 mt-1">{kpi.subtitle}</p>
              <div
                className={cn(
                  'flex items-center gap-1 mt-2 text-xs font-medium',
                  kpi.trend === 'up' && 'text-green-600',
                  kpi.trend === 'down' && 'text-red-600',
                  kpi.trend === 'neutral' && 'text-gray-600'
                )}
              >
                <TrendIcon className="h-3 w-3" />
                <span>{kpi.trendLabel}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

