'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { MonthlyProjection } from '@/lib/finance/types'
import { formatPrice, formatMoneyShort, monthLabel } from '../finance-format'

/** Ingresos (SaaS + comisión) vs coste total, y EBITDA como línea. */
export function ProjectionChart({ projection }: { projection: MonthlyProjection[] }) {
  const data = projection.map((p) => ({
    label: monthLabel(p.period),
    Ingresos: p.totalRevenue,
    Costes: p.cogs + p.totalOpex,
    EBITDA: p.ebitda,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={56} tickFormatter={formatMoneyShort} />
        <Tooltip formatter={(v, n) => [formatPrice(Number(v)), n as string]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="Ingresos" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
        <Area type="monotone" dataKey="Costes" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
        <Line type="monotone" dataKey="EBITDA" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
