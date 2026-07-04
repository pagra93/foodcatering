'use client'

/**
 * Serie de 12 meses de ingresos de Plati (comisiones netas + SaaS neto), en
 * Recharts para ser coherente con el dashboard general (ChartsSection). Ambas
 * series son NETAS (sin IVA), por lo que son comparables entre sí.
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { formatPrice } from '@/lib/utils'

type Point = { period: string; commissions: number; saas: number }

function monthLabel(ym: string) {
  return new Date(ym + '-01').toLocaleDateString('es-ES', {
    month: 'short',
    year: '2-digit',
  })
}

export function BillingTrendChart({ series }: { series: Point[] }) {
  const data = series.map((s) => ({
    label: monthLabel(s.period),
    Comisiones: s.commissions,
    SaaS: s.saas,
  }))

  const hasData = series.some((s) => s.commissions > 0 || s.saas > 0)
  if (!hasData) {
    return (
      <div className="flex h-[240px] items-center justify-center">
        <p className="text-sm text-gray-500">Aún no hay ingresos registrados</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          width={64}
          tickFormatter={(v: number) => formatPrice(v)}
        />
        <Tooltip
          formatter={(v, name) => [formatPrice(Number(v)), name as string]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Comisiones" name="Comisiones catering" fill="#22c55e" radius={[3, 3, 0, 0]} />
        <Bar dataKey="SaaS" name="SaaS a empresas" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
