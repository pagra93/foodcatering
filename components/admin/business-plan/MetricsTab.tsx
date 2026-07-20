'use client'

import { Card } from '@/components/ui/card'
import type { SaasMetricsPoint } from '@/lib/finance/types'
import { formatPrice, formatPct, formatMonths, formatMultiple } from './finance-format'

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : ''
  return (
    <Card className="p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
    </Card>
  )
}

export function MetricsTab({ metrics }: { metrics: SaasMetricsPoint[] }) {
  const last = metrics[metrics.length - 1]
  const y1 = metrics[11] // ~12 meses
  if (!last) return <p className="text-sm text-gray-500">Sin métricas.</p>

  const ltvToCacTone = last.ltvToCac == null ? undefined : last.ltvToCac >= 3 ? 'good' : last.ltvToCac >= 1 ? 'warn' : 'bad'
  const ruleTone = last.ruleOf40 >= 40 ? 'good' : last.ruleOf40 >= 20 ? 'warn' : 'bad'
  const paybackTone = last.cacPaybackMonths == null ? undefined : last.cacPaybackMonths <= 12 ? 'good' : last.cacPaybackMonths <= 18 ? 'warn' : 'bad'

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Unit economics al final del horizonte ({last.period}). Referencias sanas: LTV/CAC ≥ 3, CAC
        payback ≤ 12 m, Rule of 40 ≥ 40.
      </p>
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="MRR" value={formatPrice(last.mrr)} hint={`ARR ${formatPrice(last.arr)}`} />
        <Kpi label="Crecimiento MoM" value={formatPct(last.momGrowthPct)} hint={last.yoyGrowthPct != null ? `YoY ${formatPct(last.yoyGrowthPct)}` : undefined} />
        <Kpi label="Churn / NRR" value={formatPct(last.churnPct)} hint={`NRR ${formatPct(last.nrrPct)}`} />
        <Kpi label="ARPA" value={formatPrice(last.arpa)} hint="ingreso medio por empresa" />
        <Kpi label="CAC" value={formatPrice(last.cac)} />
        <Kpi label="LTV" value={formatPrice(last.ltv)} />
        <Kpi label="LTV / CAC" value={formatMultiple(last.ltvToCac)} tone={ltvToCacTone} hint="≥ 3 sano" />
        <Kpi label="CAC payback" value={formatMonths(last.cacPaybackMonths)} tone={paybackTone} hint="≤ 12 m sano" />
        <Kpi label="Margen bruto" value={formatPct(last.grossMarginPct)} />
        <Kpi label="Rule of 40" value={last.ruleOf40.toFixed(0)} tone={ruleTone} hint="crecim.% + margen EBITDA%" />
        <Kpi label="Burn multiple" value={formatMultiple(last.burnMultiple)} hint="net burn / net new ARR" />
        {y1 && <Kpi label="MRR a 12m" value={formatPrice(y1.mrr)} hint={`el mes ${y1.period}`} />}
      </div>
    </div>
  )
}
