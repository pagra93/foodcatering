'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import type { MonthlyProjection } from '@/lib/finance/types'
import { formatPrice, formatMoneyShort, monthLabel } from '../finance-format'

/** Saldo de caja mes a mes; marca el break-even si existe. */
export function RunwayChart({
  projection,
  breakEvenMonth,
}: {
  projection: MonthlyProjection[]
  breakEvenMonth: string | null
}) {
  const data = projection.map((p) => ({ label: monthLabel(p.period), period: p.period, Caja: p.cashBalance }))
  const beLabel = breakEvenMonth ? monthLabel(breakEvenMonth) : null

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={56} tickFormatter={formatMoneyShort} />
        <Tooltip formatter={(v) => [formatPrice(Number(v)), 'Caja']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
        {beLabel && (
          <ReferenceLine x={beLabel} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'break-even', fontSize: 10, fill: '#16a34a' }} />
        )}
        <Area type="monotone" dataKey="Caja" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#cashFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
