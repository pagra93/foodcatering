/**
 * Sección de gráficas del dashboard
 * Por ahora con visualización simple, luego se puede integrar Recharts o Chart.js
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'

type ChartData = {
  ordersPerDay: Array<{
    date: Date
    count: number
  }>
  companiesGrowth: {
    new: Array<{
      month: string
      count: number
    }>
    churned: Array<{
      month: string
      count: number
    }>
  }
  revenuePerMonth: Array<{
    month: string
    total: number
  }>
}

export function ChartsSection({ data }: { data: ChartData }) {
  // Calcular valores máximos para escalado visual
  const maxOrders = Math.max(...data.ordersPerDay.map((d) => d.count), 1)
  const maxRevenue = Math.max(...data.revenuePerMonth.map((d) => d.total), 1)

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Pedidos por día (últimos 30 días) */}
      <Card className="border-0 shadow-sm md:col-span-2">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Pedidos por Día (Últimos 30 Días)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {data.ordersPerDay.length === 0 ? (
              <p className="text-center text-sm text-gray-500">
                No hay datos disponibles
              </p>
            ) : (
              <div className="flex items-end justify-between gap-1" style={{ height: '200px' }}>
                {data.ordersPerDay.map((day, index) => {
                  const height = (day.count / maxOrders) * 100
                  return (
                    <div key={index} className="flex flex-1 flex-col items-center justify-end">
                      <div
                        className="w-full rounded-t bg-blue-500 transition-all hover:bg-blue-600"
                        style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                        title={`${day.date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}: ${day.count} pedidos`}
                      />
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {data.ordersPerDay[0]?.date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
              </span>
              <span>Hoy</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empresas nuevas vs churn */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Crecimiento de Empresas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {data.companiesGrowth.new.length === 0 ? (
              <p className="text-center text-sm text-gray-500">
                No hay datos disponibles
              </p>
            ) : (
              <>
                {data.companiesGrowth.new.slice(-6).map((month, _index) => {
                  const churned = data.companiesGrowth.churned.find(
                    (c) => c.month === month.month
                  )
                  const netGrowth = month.count - (churned?.count || 0)

                  return (
                    <div key={month.month} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">
                          {new Date(month.month + '-01').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}
                        </span>
                        <span className={netGrowth >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {netGrowth >= 0 ? '+' : ''}{netGrowth}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <div
                          className="h-2 rounded bg-green-500"
                          style={{ width: `${(month.count / (month.count + (churned?.count || 0))) * 100}%` }}
                          title={`${month.count} nuevas`}
                        />
                        {churned && churned.count > 0 && (
                          <div
                            className="h-2 rounded bg-red-500"
                            style={{ width: `${(churned.count / (month.count + churned.count)) * 100}%` }}
                            title={`${churned.count} churn`}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ingresos por mes */}
      <Card className="border-0 shadow-sm md:col-span-2 lg:col-span-3">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Ingresos Mensuales (Últimos 12 Meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {data.revenuePerMonth.length === 0 ? (
              <p className="text-center text-sm text-gray-500">
                No hay datos disponibles
              </p>
            ) : (
              <div className="flex items-end justify-between gap-2" style={{ height: '200px' }}>
                {data.revenuePerMonth.map((month, _index) => {
                  const height = (month.total / maxRevenue) * 100
                  return (
                    <div key={month.month} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-xs font-medium text-gray-600">
                        {formatPrice(month.total)}
                      </span>
                      <div
                        className="w-full rounded-t bg-green-500 transition-all hover:bg-green-600"
                        style={{ height: `${height}%`, minHeight: month.total > 0 ? '8px' : '0' }}
                        title={`${month.month}: ${formatPrice(month.total)}`}
                      />
                      <span className="text-xs text-gray-500">
                        {new Date(month.month + '-01').toLocaleDateString('es-ES', { month: 'short' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

