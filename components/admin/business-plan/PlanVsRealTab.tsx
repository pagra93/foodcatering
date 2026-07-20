'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buildPlanVsReal, METRIC_LABEL } from '@/lib/finance'
import type { MonthlyProjection, ActualsSeriesPoint, MetricKey, PlanVsRealRow } from '@/lib/finance/types'
import type { ActualRow } from '@/lib/db/queries/admin-business-plan'
import { PlanVsRealChart } from './charts/PlanVsRealChart'
import { ActualsEditor } from './ActualsEditor'
import { formatPrice, formatPct, monthLabel } from './finance-format'

const METRICS: MetricKey[] = [
  'totalRevenue',
  'mrrSaas',
  'commissionRevenue',
  'saasRevenue',
  'gmv',
  'activeCompanies',
  'activeCaterings',
]

const STATUS_STYLE: Record<PlanVsRealRow['status'], string> = {
  ok: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-700',
  off: 'bg-red-100 text-red-700',
  na: 'bg-gray-100 text-gray-400',
}

const isMoney = (m: MetricKey) => m !== 'activeCompanies' && m !== 'activeCaterings'

export function PlanVsRealTab({
  projection,
  actuals,
  actualRows,
  currentMonth,
}: {
  projection: MonthlyProjection[]
  actuals: ActualsSeriesPoint[]
  actualRows: ActualRow[]
  currentMonth: string
}) {
  const [metric, setMetric] = useState<MetricKey>('totalRevenue')
  const rows = useMemo(() => buildPlanVsReal(projection, actuals, metric), [projection, actuals, metric])
  // Ventana de comparación: hasta el mes actual (donde puede haber real).
  const windowRows = rows.filter((r) => r.period <= currentMonth)
  const fmt = (v: number | null) => (v == null ? '—' : isMoney(metric) ? formatPrice(v) : String(Math.round(v)))

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <Label className="text-xs">Métrica</Label>
          <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
            <SelectTrigger className="h-9 w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map((m) => (
                <SelectItem key={m} value={m}>
                  {METRIC_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold">Plan vs Real · {METRIC_LABEL[metric]}</h3>
        <PlanVsRealChart rows={windowRows} />
        <p className="mt-2 text-[11px] text-gray-400">
          MRR y empresas/caterings reales aparecen desde que empieces a capturar snapshots; ingresos,
          comisiones y GMV ya tienen serie real.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-right text-xs">
            <thead className="sticky top-0 border-b bg-gray-50 text-[10px] uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Mes</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Real</th>
                <th className="px-3 py-2">Varianza</th>
                <th className="px-3 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {windowRows.map((r) => (
                <tr key={r.period} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-1.5 text-left font-medium">{monthLabel(r.period)}</td>
                  <td className="px-3 py-1.5">{fmt(r.planned)}</td>
                  <td className="px-3 py-1.5 font-semibold">{fmt(r.actual)}</td>
                  <td className={`px-3 py-1.5 ${r.variance != null && r.variance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {r.variancePct != null ? formatPct(r.variancePct) : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[r.status]}`}>
                      {r.status === 'na' ? 'sin dato' : r.status === 'ok' ? 'en plan' : r.status === 'warn' ? 'desvío' : 'lejos'}
                    </span>
                  </td>
                </tr>
              ))}
              {windowRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                    Aún no hay meses en la ventana de comparación.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ActualsEditor rows={actualRows} currentMonth={currentMonth} />
    </div>
  )
}
