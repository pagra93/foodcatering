/**
 * KPIs del Historial de Pedidos
 * Métricas resumidas
 */

'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Euro,
  CheckCircle,
  XCircle,
} from 'lucide-react'

type HistorialKPIsProps = {
  data: {
    totalOrders: number
    ordersLast3Months: number
    ordersLast6Months: number
    totalSpent: number
    spentLast3Months: number
    deliveredOrders: number
    cancelledOrders: number
    cancelledRate: number
  }
}

export function HistorialKPIs({ data }: HistorialKPIsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Total pedidos */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Total Pedidos</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {data.totalOrders}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {data.ordersLast3Months} últimos 3m
            </p>
          </div>
          <Calendar className="h-8 w-8 text-primary" />
        </div>
      </Card>

      {/* Gasto total */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Gasto Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {data.totalSpent.toFixed(0)}€
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {data.spentLast3Months.toFixed(0)}€ últimos 3m
            </p>
          </div>
          <Euro className="h-8 w-8 text-green-600" />
        </div>
      </Card>

      {/* Entregados */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Entregados</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {data.deliveredOrders}
            </p>
            <Badge variant="default" className="mt-1 text-xs">
              <CheckCircle className="mr-1 h-3 w-3" />
              {data.totalOrders > 0
                ? Math.round((data.deliveredOrders / data.totalOrders) * 100)
                : 0}
              %
            </Badge>
          </div>
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
      </Card>

      {/* Cancelaciones */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Cancelaciones</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {data.cancelledOrders}
            </p>
            <Badge
              variant={data.cancelledRate > 10 ? 'destructive' : 'secondary'}
              className="mt-1 text-xs"
            >
              {data.cancelledRate.toFixed(1)}%
            </Badge>
          </div>
          <XCircle className={`h-8 w-8 ${data.cancelledRate > 10 ? 'text-red-600' : 'text-gray-400'}`} />
        </div>
      </Card>
    </div>
  )
}

