/**
 * Componente de KPIs principales para un catering
 * Muestra métricas operativas críticas con semáforos de estado
 */

'use client'

import { TrendingUp, TrendingDown, Minus, Package, Clock, AlertTriangle, Star, Ban } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type KPIData = {
  ordersLast30Days: number
  ordersLast90Days: number
  punctualityRate: number | null // Decimal convertido a number
  incidentRate: number | null
  averageRating: number | null
  incidentsCount: number
  postCutoffCancellations: number
}

type CateringKPIsProps = {
  kpis: KPIData
}

// Helper para determinar el color del semáforo
function getSLAColor(value: number, metric: 'punctuality' | 'incidents' | 'satisfaction'): 'success' | 'warning' | 'destructive' {
  if (metric === 'punctuality') {
    if (value >= 95) return 'success'
    if (value >= 90) return 'warning'
    return 'destructive'
  }
  
  if (metric === 'incidents') {
    if (value < 2) return 'success'
    if (value <= 5) return 'warning'
    return 'destructive'
  }
  
  if (metric === 'satisfaction') {
    if (value >= 4.5) return 'success'
    if (value >= 4.0) return 'warning'
    return 'destructive'
  }
  
  return 'secondary'
}

// Componente de KPI individual
function KPICard({
  title,
  value,
  unit = '',
  icon: Icon,
  trend,
  trendValue,
  badgeVariant,
  badgeText,
}: {
  title: string
  value: string | number
  unit?: string
  icon: any
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  badgeVariant?: 'success' | 'warning' | 'destructive' | 'secondary'
  badgeText?: string
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-500" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {unit && <span className="text-sm text-gray-500">{unit}</span>}
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          {trend && trendValue && (
            <div className={`flex items-center text-xs ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-500'
            }`}>
              <TrendIcon className="mr-1 h-3 w-3" />
              {trendValue}
            </div>
          )}
          
          {badgeVariant && badgeText && (
            <Badge variant={badgeVariant} className="text-xs">
              {badgeText}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function CateringKPIs({ kpis }: CateringKPIsProps) {
  const punctualityRate = kpis.punctualityRate ? Number(kpis.punctualityRate) : 0
  const incidentRate = kpis.incidentRate ? Number(kpis.incidentRate) : 0
  const averageRating = kpis.averageRating ? Number(kpis.averageRating) : 0

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Indicadores Clave de Rendimiento (KPIs)
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Métricas de los últimos 30 días con semáforos de estado
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Pedidos */}
        <KPICard
          title="Pedidos (30 días)"
          value={kpis.ordersLast30Days}
          unit="pedidos"
          icon={Package}
          trend={kpis.ordersLast30Days > (kpis.ordersLast90Days / 3) ? 'up' : 'down'}
          trendValue={`${((kpis.ordersLast30Days / (kpis.ordersLast90Days / 3) - 1) * 100).toFixed(1)}% vs promedio`}
        />

        {/* Puntualidad */}
        <KPICard
          title="Puntualidad (SLA)"
          value={punctualityRate.toFixed(1)}
          unit="%"
          icon={Clock}
          badgeVariant={getSLAColor(punctualityRate, 'punctuality')}
          badgeText={
            punctualityRate >= 95 ? '✓ Excelente' :
            punctualityRate >= 90 ? '⚠ Advertencia' :
            '✗ Crítico'
          }
        />

        {/* Incidencias */}
        <KPICard
          title="Tasa de Incidencias"
          value={incidentRate.toFixed(2)}
          unit="%"
          icon={AlertTriangle}
          badgeVariant={getSLAColor(incidentRate, 'incidents')}
          badgeText={`${kpis.incidentsCount} incidencias`}
        />

        {/* Satisfacción */}
        <KPICard
          title="Satisfacción (Rating)"
          value={averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
          unit={averageRating > 0 ? '/ 5' : ''}
          icon={Star}
          badgeVariant={averageRating > 0 ? getSLAColor(averageRating, 'satisfaction') : 'secondary'}
          badgeText={
            averageRating >= 4.5 ? '⭐ Excelente' :
            averageRating >= 4.0 ? '⚠ Bueno' :
            averageRating > 0 ? '✗ Necesita mejora' :
            'Sin datos'
          }
        />

        {/* Cancelaciones Post-Cutoff */}
        {kpis.postCutoffCancellations > 0 && (
          <KPICard
            title="Cancelaciones Post-Cutoff"
            value={kpis.postCutoffCancellations}
            unit="cancelaciones"
            icon={Ban}
            badgeVariant={kpis.postCutoffCancellations > 5 ? 'destructive' : 'warning'}
            badgeText={kpis.postCutoffCancellations > 5 ? 'Alta' : 'Moderada'}
          />
        )}
      </div>
    </div>
  )
}

