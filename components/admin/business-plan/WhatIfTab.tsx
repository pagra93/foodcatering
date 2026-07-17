'use client'

import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { whatIfCommission } from '@/lib/finance'
import type { Assumptions } from '@/lib/validations/finance'
import type { ActualsSeriesPoint } from '@/lib/finance/types'
import { formatPrice, formatPct, monthLabel } from './finance-format'

type Pricing = Assumptions['pricing']

function Num({
  label,
  value,
  onChange,
  step = 0.5,
  suffix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  suffix?: string
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className="h-8"
        />
        {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
      </div>
    </div>
  )
}

export function WhatIfTab({
  actuals,
  initialPricing,
  currentMonth,
}: {
  actuals: ActualsSeriesPoint[]
  initialPricing: Pricing
  currentMonth: string
}) {
  // Ventana: meses reales hasta el mes actual (donde hay GMV facturado).
  const realRows = useMemo(
    () => actuals.filter((a) => a.period <= currentMonth),
    [actuals, currentMonth]
  )

  const [pricing, setPricing] = useState<Pricing>(() => structuredClone(initialPricing))
  const upd = (mut: (p: Pricing) => void) => {
    setPricing((prev) => {
      const next = structuredClone(prev)
      mut(next)
      return next
    })
  }
  const reset = () => setPricing(structuredClone(initialPricing))

  const result = useMemo(() => whatIfCommission(realRows, pricing), [realRows, pricing])
  const gain = result.totals.delta >= 0

  if (realRows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-gray-500">
        Aún no hay meses con facturación real para simular. Genera la facturación mensual y vuelve aquí.
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Coge tu <strong>GMV y comisión realmente facturados</strong> en los últimos {result.totals.months}{' '}
        meses y les aplica una comisión hipotética. No es proyección: es el € exacto de más/menos que
        habrías ganado <strong>sobre lo ya facturado</strong>.
      </p>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Comisión hipotética a probar</h3>
          <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs">
            <RotateCcw className="mr-1 h-3 w-3" />
            Volver a la del escenario
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Num label="Comisión Básico" value={pricing.cateringCommission.basico} suffix="% GMV" onChange={(v) => upd((p) => { p.cateringCommission.basico = v })} />
          <Num label="Comisión Estándar" value={pricing.cateringCommission.estandar} suffix="% GMV" onChange={(v) => upd((p) => { p.cateringCommission.estandar = v })} />
          <Num label="Comisión Premium" value={pricing.cateringCommission.premium} suffix="% GMV" onChange={(v) => upd((p) => { p.cateringCommission.premium = v })} />
          <Num label="Cuota fija" value={pricing.cateringFixedFee} step={10} suffix="€/mes" onChange={(v) => upd((p) => { p.cateringFixedFee = v })} />
          <Num label="Reparto Básico" value={pricing.cateringMix.basico} step={1} onChange={(v) => upd((p) => { p.cateringMix.basico = v })} />
          <Num label="Reparto Estándar" value={pricing.cateringMix.estandar} step={1} onChange={(v) => upd((p) => { p.cateringMix.estandar = v })} />
          <Num label="Reparto Premium" value={pricing.cateringMix.premium} step={1} onChange={(v) => upd((p) => { p.cateringMix.premium = v })} />
          <Num label="Reparto Cuota fija" value={pricing.cateringMix.fija} step={1} onChange={(v) => upd((p) => { p.cateringMix.fija = v })} />
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] uppercase text-gray-500">Comisión efectiva</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatPct(result.blendedCommissionPct)}</p>
          <p className="text-[11px] text-gray-400">real actual: {formatPct(result.realEffectivePct)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase text-gray-500">Δ sobre lo facturado ({result.totals.months} m)</p>
          <p className={`mt-1 text-lg font-semibold ${gain ? 'text-emerald-600' : 'text-red-600'}`}>
            {gain ? '+' : ''}{formatPrice(result.totals.delta)}
          </p>
          <p className="text-[11px] text-gray-400">
            real {formatPrice(result.totals.realCommission)} → hipot. {formatPrice(result.totals.hypotheticalCommission)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase text-gray-500">Δ anualizado</p>
          <p className={`mt-1 text-lg font-semibold ${result.annualizedDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {result.annualizedDelta >= 0 ? '+' : ''}{formatPrice(result.annualizedDelta)}
          </p>
          <p className="text-[11px] text-gray-400">extrapolado a 12 meses</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-right text-xs">
            <thead className="sticky top-0 border-b bg-gray-50 text-[10px] uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Mes</th>
                <th className="px-3 py-2">GMV real</th>
                <th className="px-3 py-2">Comisión real</th>
                <th className="px-3 py-2">Comisión hipot.</th>
                <th className="px-3 py-2">Δ</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.period} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-1.5 text-left font-medium">{monthLabel(r.period)}</td>
                  <td className="px-3 py-1.5 text-gray-500">{formatPrice(r.gmv)}</td>
                  <td className="px-3 py-1.5">{formatPrice(r.realCommission)}</td>
                  <td className="px-3 py-1.5 font-semibold">{formatPrice(r.hypotheticalCommission)}</td>
                  <td className={`px-3 py-1.5 ${r.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.delta >= 0 ? '+' : ''}{formatPrice(r.delta)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="px-3 py-2 text-left">Total</td>
                <td className="px-3 py-2 text-gray-500">{formatPrice(result.totals.gmv)}</td>
                <td className="px-3 py-2">{formatPrice(result.totals.realCommission)}</td>
                <td className="px-3 py-2">{formatPrice(result.totals.hypotheticalCommission)}</td>
                <td className={`px-3 py-2 ${gain ? 'text-emerald-600' : 'text-red-600'}`}>
                  {gain ? '+' : ''}{formatPrice(result.totals.delta)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
