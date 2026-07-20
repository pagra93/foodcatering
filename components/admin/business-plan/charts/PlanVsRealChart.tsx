'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { PlanVsRealRow } from '@/lib/finance/types'
import { formatMoneyShort, monthLabel } from '../finance-format'

/** Plan (línea continua) vs Real (con huecos donde no hay dato). */
export function PlanVsRealChart({ rows }: { rows: PlanVsRealRow[] }) {
  const data = rows.map((r) => ({
    label: monthLabel(r.period),
    Plan: r.planned,
    Real: r.actual,
  }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={56} tickFormatter={(v: number) => formatMoneyShort(v)} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="Plan" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Real" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
