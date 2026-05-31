/**
 * Estadísticas del Empleado
 * KPIs y gráficas de consumo
 */

'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Calendar,
  Euro,
  XCircle,
  Clock,
  BarChart3,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type ProfileStatsProps = {
  data: {
    stats: {
      thisMonth: {
        orders: number
        spent: number
        cancelled: number
      }
      last30Days: {
        orders: number
        spent: number
      }
      lastOrder: {
        date: Date
        status: string
        price: number
      } | null
    }
    company: {
      dailyLimit: number
      monthlyLimit: number | null
    }
  }
  monthlyHistory: Array<{
    month: Date
    orders: number
    spent: number
  }>
}

export function ProfileStats({ data, monthlyHistory }: ProfileStatsProps) {
  const { stats, company } = data

  // Calcular promedio diario
  const avgDailySpend =
    stats.last30Days.orders > 0
      ? stats.last30Days.spent / stats.last30Days.orders
      : 0

  // Calcular % usado del límite mensual
  const monthlyUsagePercent = company.monthlyLimit
    ? (stats.thisMonth.spent / company.monthlyLimit) * 100
    : null

  return (
    <div className="space-y-6">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pedidos este mes */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pedidos este mes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.thisMonth.orders}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        {/* Gasto este mes */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Gasto este mes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.thisMonth.spent.toFixed(2)}€
              </p>
              {monthlyUsagePercent !== null && (
                <Badge
                  variant={monthlyUsagePercent > 90 ? 'destructive' : 'secondary'}
                  className="mt-2"
                >
                  {monthlyUsagePercent.toFixed(0)}% del límite
                </Badge>
              )}
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Euro className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Promedio por pedido */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Promedio por pedido</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {avgDailySpend.toFixed(2)}€
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Límite: {company.dailyLimit.toFixed(2)}€
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Cancelaciones */}
      {stats.thisMonth.cancelled > 0 && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-900">
                {stats.thisMonth.cancelled} pedido{stats.thisMonth.cancelled > 1 ? 's' : ''} cancelado{stats.thisMonth.cancelled > 1 ? 's' : ''} este mes
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Intenta cancelar antes del cutoff para evitar penalizaciones
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Último pedido */}
      {stats.lastOrder && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Último Pedido
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Fecha</p>
              <p className="text-base font-medium text-gray-900 mt-1">
                {format(new Date(stats.lastOrder.date), "EEEE, d 'de' MMMM", {
                  locale: es,
                })}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-500">Importe</p>
              <p className="text-base font-medium text-gray-900 mt-1">
                {stats.lastOrder.price.toFixed(2)}€
              </p>
            </div>

            <div>
              <Badge
                variant={
                  stats.lastOrder.status === 'DELIVERED'
                    ? 'default'
                    : stats.lastOrder.status === 'CONFIRMED'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {stats.lastOrder.status === 'DELIVERED'
                  ? 'Entregado'
                  : stats.lastOrder.status === 'CONFIRMED'
                  ? 'Confirmado'
                  : stats.lastOrder.status}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Historial Mensual */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Historial Últimos 6 Meses
        </h3>

        <div className="space-y-3">
          {monthlyHistory.map((month) => {
            const monthName = format(month.month, 'MMMM yyyy', { locale: es })
            const avgPerOrder = month.orders > 0 ? month.spent / month.orders : 0

            return (
              <div
                key={month.month.toISOString()}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {monthName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {month.orders} pedido{month.orders !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {month.spent.toFixed(2)}€
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ~{avgPerOrder.toFixed(2)}€/pedido
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Resumen general */}
      <Card className="p-4 bg-primary/10 border-primary/30">
        <h4 className="text-sm font-semibold text-primary mb-2">
          💡 Resumen
        </h4>
        <ul className="text-sm text-primary space-y-1">
          <li>
            • Has realizado <strong>{stats.last30Days.orders} pedidos</strong> en
            los últimos 30 días
          </li>
          <li>
            • Tu gasto promedio por pedido es de{' '}
            <strong>{avgDailySpend.toFixed(2)}€</strong>
          </li>
          {company.monthlyLimit && (
            <li>
              • Te quedan{' '}
              <strong>
                {(company.monthlyLimit - stats.thisMonth.spent).toFixed(2)}€
              </strong>{' '}
              disponibles este mes
            </li>
          )}
        </ul>
      </Card>
    </div>
  )
}

