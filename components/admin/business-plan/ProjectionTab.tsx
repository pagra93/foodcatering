'use client'

import { Card } from '@/components/ui/card'
import type { MonthlyProjection, ModelSummary } from '@/lib/finance/types'
import { ProjectionChart } from './charts/ProjectionChart'
import { RunwayChart } from './charts/RunwayChart'
import { formatPrice, formatMoneyShort, formatMonths, monthLabel } from './finance-format'

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : ''}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </Card>
  )
}

export function ProjectionTab({
  projection,
  summary,
}: {
  projection: MonthlyProjection[]
  summary: ModelSummary
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-5">
        <Kpi label="MRR final" value={formatPrice(summary.endingMrr)} sub={`ARR ${formatMoneyShort(summary.endingArr)}`} />
        <Kpi
          label="Break-even"
          value={summary.breakEvenMonth ? monthLabel(summary.breakEvenMonth) : 'No en el horizonte'}
          tone={summary.breakEvenMonth ? 'good' : 'bad'}
        />
        <Kpi label="Runway" value={formatMonths(summary.runwayMonths)} sub="al ritmo final" />
        <Kpi
          label="Caja mínima"
          value={formatPrice(summary.minCashBalance)}
          sub={summary.minCashMonth ? `en ${monthLabel(summary.minCashMonth)}` : undefined}
          tone={summary.minCashBalance < 0 ? 'bad' : undefined}
        />
        <Kpi label="Burn pico" value={formatPrice(summary.peakMonthlyBurn)} sub={`acum. ${formatMoneyShort(summary.cumulativeBurn)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Ingresos vs coste · EBITDA</h3>
          <ProjectionChart projection={projection} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Caja / runway</h3>
          <RunwayChart projection={projection} breakEvenMonth={summary.breakEvenMonth} />
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full text-right text-xs">
            <thead className="sticky top-0 z-10 border-b bg-gray-50 text-[10px] uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Mes</th>
                <th className="px-3 py-2">Empresas</th>
                <th className="px-3 py-2">MRR</th>
                <th className="px-3 py-2">GMV</th>
                <th className="px-3 py-2">Comisión</th>
                <th className="px-3 py-2">Ingresos</th>
                <th className="px-3 py-2">COGS</th>
                <th className="px-3 py-2">Margen</th>
                <th className="px-3 py-2">OpEx</th>
                <th className="px-3 py-2">EBITDA</th>
                <th className="px-3 py-2">Caja</th>
              </tr>
            </thead>
            <tbody>
              {projection.map((p) => (
                <tr key={p.period} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-1.5 text-left font-medium">{monthLabel(p.period)}</td>
                  <td className="px-3 py-1.5">{Math.round(p.activeCompanies)}</td>
                  <td className="px-3 py-1.5">{formatMoneyShort(p.mrrSaas)}</td>
                  <td className="px-3 py-1.5 text-gray-500">{formatMoneyShort(p.gmv)}</td>
                  <td className="px-3 py-1.5">{formatMoneyShort(p.commissionRevenue)}</td>
                  <td className="px-3 py-1.5 font-semibold">{formatMoneyShort(p.totalRevenue)}</td>
                  <td className="px-3 py-1.5 text-gray-500">{formatMoneyShort(p.cogs)}</td>
                  <td className="px-3 py-1.5">{p.grossMarginPct.toFixed(0)}%</td>
                  <td className="px-3 py-1.5 text-gray-500">{formatMoneyShort(p.totalOpex)}</td>
                  <td className={`px-3 py-1.5 font-semibold ${p.ebitda >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMoneyShort(p.ebitda)}</td>
                  <td className={`px-3 py-1.5 ${p.cashBalance < 0 ? 'text-red-600' : ''}`}>{formatMoneyShort(p.cashBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
