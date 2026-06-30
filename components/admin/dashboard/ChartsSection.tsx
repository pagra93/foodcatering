/**
 * Sección de gráficas del dashboard — Recharts.
 * Los datos provienen de queries reales (getDashboardCharts).
 */

'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
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

function monthLabel(ym: string) {
  // ym = "YYYY-MM"
  return new Date(ym + '-01').toLocaleDateString('es-ES', {
    month: 'short',
    year: '2-digit',
  })
}

function EmptyState() {
  return (
    <div className="flex h-[220px] items-center justify-center">
      <p className="text-sm text-gray-500">No hay datos disponibles</p>
    </div>
  )
}

export function ChartsSection({ data }: { data: ChartData }) {
  // Pedidos por día → serie con etiqueta corta dd/MM
  const ordersData = data.ordersPerDay.map((d) => ({
    label: new Date(d.date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
    }),
    pedidos: d.count,
  }))

  // Crecimiento de empresas → merge new vs churn por mes
  const growthByMonth = new Map<string, { nuevas: number; churn: number }>()
  for (const m of data.companiesGrowth.new) {
    growthByMonth.set(m.month, {
      nuevas: m.count,
      churn: growthByMonth.get(m.month)?.churn ?? 0,
    })
  }
  for (const m of data.companiesGrowth.churned) {
    growthByMonth.set(m.month, {
      nuevas: growthByMonth.get(m.month)?.nuevas ?? 0,
      churn: m.count,
    })
  }
  const growthData = Array.from(growthByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({ label: monthLabel(month), ...v }))

  // Ingresos por mes
  const revenueData = data.revenuePerMonth.map((m) => ({
    label: monthLabel(m.month),
    ingresos: m.total,
  }))

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
          {ordersData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={ordersData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} width={32} />
                <Tooltip
                  formatter={(v) => [`${Number(v)} pedidos`, 'Pedidos']}
                  labelClassName="text-xs"
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="pedidos"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#ordersFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Crecimiento de empresas (nuevas vs churn) */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Crecimiento de Empresas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {growthData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={growthData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} width={32} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="nuevas" name="Nuevas" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="churn" name="Churn" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
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
          {revenueData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  width={64}
                  tickFormatter={(v: number) => formatPrice(v)}
                />
                <Tooltip
                  formatter={(v) => [formatPrice(Number(v)), 'Ingresos']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
