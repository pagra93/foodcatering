'use client'

import { Card } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type KPI = {
  label: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'stable'
  format?: 'number' | 'percentage' | 'currency'
  description?: string
}

type DashboardKPIsProps = {
  kpis: KPI[]
}

export function DashboardKPIs({ kpis }: DashboardKPIsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="text-sm font-medium text-gray-600">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatValue(kpi.value, kpi.format)}
              </p>
              {kpi.description && (
                <p className="text-xs text-gray-500">{kpi.description}</p>
              )}
            </div>

            {kpi.change !== undefined && (
              <div className="flex items-center gap-1">
                {kpi.trend === 'up' && (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                )}
                {kpi.trend === 'down' && (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                {kpi.trend === 'stable' && (
                  <Minus className="h-4 w-4 text-gray-400" />
                )}
                <span
                  className={`text-sm font-medium ${
                    kpi.trend === 'up'
                      ? 'text-green-600'
                      : kpi.trend === 'down'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {kpi.change > 0 ? '+' : ''}
                  {kpi.change}%
                </span>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

function formatValue(
  value: string | number,
  format?: 'number' | 'percentage' | 'currency'
): string {
  if (typeof value === 'string') return value

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
      }).format(value)
    case 'percentage':
      return `${value}%`
    default:
      return value.toLocaleString('es-ES')
  }
}

