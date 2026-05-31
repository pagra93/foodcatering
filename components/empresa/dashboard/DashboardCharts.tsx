'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

type DashboardChartsProps = {
  data: {
    ordersByDay: Array<{
      date: string
      pedidos: number
    }>
  }
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  const maxValue = Math.max(...data.ordersByDay.map((d) => d.pedidos), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Evolución de Pedidos - Últimos 30 Días
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.ordersByDay.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-gray-400">
            No hay datos suficientes para mostrar
          </div>
        ) : (
          <div className="space-y-2">
            {/* Simple bar chart */}
            <div className="flex items-end justify-between h-64 gap-1">
              {data.ordersByDay.map((day) => {
                const height = (day.pedidos / maxValue) * 100
                return (
                  <div
                    key={day.date}
                    className="flex flex-col items-center flex-1 group"
                  >
                    <div className="relative w-full">
                      <div
                        className="w-full bg-primary hover:bg-primary transition-colors rounded-t-md cursor-pointer"
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${day.date}: ${day.pedidos} pedidos`}
                      />
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        {day.pedidos}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Labels */}
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
              <span>{data.ordersByDay[0]?.date}</span>
              <span>
                {data.ordersByDay[Math.floor(data.ordersByDay.length / 2)]?.date}
              </span>
              <span>{data.ordersByDay[data.ordersByDay.length - 1]?.date}</span>
            </div>

            {/* Leyenda */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-primary" />
                <span className="text-sm text-gray-600">Pedidos por día</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

