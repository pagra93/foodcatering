'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import type { SensitivityBar } from '@/lib/finance/scenarios'
import { formatPrice, formatMoneyShort } from '../finance-format'

/** Tornado: impacto en el ARR final de ±X% en cada driver (delta vs base). */
export function SensitivityChart({ bars }: { bars: SensitivityBar[] }) {
  const data = bars
    .map((b) => ({ label: b.label, Bajada: b.low - b.base, Subida: b.high - b.base }))
    .reverse() // el de mayor impacto arriba

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, bars.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }} stackOffset="sign">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v: number) => formatMoneyShort(v)} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} width={130} />
        <Tooltip formatter={(v, n) => [formatPrice(Number(v)), n as string]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <ReferenceLine x={0} stroke="#9ca3af" />
        <Bar dataKey="Bajada" stackId="s" fill="#ef4444" radius={[3, 0, 0, 3]} />
        <Bar dataKey="Subida" stackId="s" fill="#22c55e" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
