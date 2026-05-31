'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Utensils, Euro, TrendingUp } from 'lucide-react'

type OrdersKPIsProps = {
  stats: {
    totalOrders: number
    totalAmount: number
    avgTicket: number
  }
}

export function OrdersKPIs({ stats }: OrdersKPIsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Pedidos
          </CardTitle>
          <Utensils className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalOrders}
          </div>
          <p className="text-xs text-gray-500 mt-1">En el período seleccionado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Gasto Total
          </CardTitle>
          <Euro className="h-5 w-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalAmount.toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1">Suma de todos los pedidos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Ticket Medio
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {stats.avgTicket.toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR',
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1">Promedio por pedido</p>
        </CardContent>
      </Card>
    </div>
  )
}

