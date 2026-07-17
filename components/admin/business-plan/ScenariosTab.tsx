'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { compareScenarios, sensitivity } from '@/lib/finance'
import type { Assumptions } from '@/lib/validations/finance'
import type { ScenarioRow } from '@/lib/db/queries/admin-business-plan'
import { SensitivityChart } from './charts/SensitivityChart'
import { formatPrice, formatMonths, monthLabel } from './finance-format'

export function ScenariosTab({
  scenarios,
  workingKey,
  workingAssumptions,
  startMonth,
  horizonMonths,
}: {
  scenarios: ScenarioRow[]
  workingKey: string
  workingAssumptions: Assumptions
  startMonth: string
  horizonMonths: number
}) {
  const comparison = useMemo(
    () =>
      compareScenarios(
        scenarios.map((s) => ({
          key: s.key,
          name: s.name,
          assumptions: s.assumptions,
          startMonth: s.startMonth,
          horizonMonths: s.horizonMonths,
        }))
      ),
    [scenarios]
  )

  const sens = useMemo(
    () => sensitivity(workingAssumptions, startMonth, horizonMonths, 20),
    [workingAssumptions, startMonth, horizonMonths]
  )

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50 p-3 text-sm font-semibold">Comparativa de escenarios (fin del horizonte)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b bg-gray-50 text-[10px] uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Escenario</th>
                <th className="px-3 py-2">MRR final</th>
                <th className="px-3 py-2">ARR final</th>
                <th className="px-3 py-2">Break-even</th>
                <th className="px-3 py-2">Caja mínima</th>
                <th className="px-3 py-2">Burn acum.</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((c) => (
                <tr key={c.key} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 text-left font-medium">
                    {c.name}
                    {c.key === workingKey && <Badge variant="outline" className="ml-2 text-[10px]">actual</Badge>}
                  </td>
                  <td className="px-3 py-2">{formatPrice(c.summary.endingMrr)}</td>
                  <td className="px-3 py-2 font-semibold">{formatPrice(c.summary.endingArr)}</td>
                  <td className="px-3 py-2">{c.summary.breakEvenMonth ? monthLabel(c.summary.breakEvenMonth) : '—'}</td>
                  <td className={`px-3 py-2 ${c.summary.minCashBalance < 0 ? 'text-red-600' : ''}`}>{formatPrice(c.summary.minCashBalance)}</td>
                  <td className="px-3 py-2 text-gray-500">{formatPrice(c.summary.cumulativeBurn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-1 text-sm font-semibold">Sensibilidad — impacto en el ARR final (±20%)</h3>
        <p className="mb-3 text-xs text-gray-500">
          Qué palancas mueven más el negocio en el escenario actual. Base: ARR final {formatPrice(sens.base)}.
          Runway del escenario base: {formatMonths(comparison.find((c) => c.key === workingKey)?.summary.runwayMonths ?? null)}.
        </p>
        <SensitivityChart bars={sens.bars} />
      </Card>
    </div>
  )
}
