'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { runModel } from '@/lib/finance'
import type { Assumptions } from '@/lib/validations/finance'
import type { ScenarioRow, ActualRow } from '@/lib/db/queries/admin-business-plan'
import type { ActualsSeriesPoint } from '@/lib/finance/types'
import { AssumptionsTab } from './AssumptionsTab'
import { ProjectionTab } from './ProjectionTab'
import { MetricsTab } from './MetricsTab'
import { PlanVsRealTab } from './PlanVsRealTab'
import { saveScenarioAction } from './actions'

type Working = {
  key: string
  name: string
  kind: ScenarioRow['kind']
  startMonth: string
  horizonMonths: number
  assumptions: Assumptions
}

const toWorking = (s: ScenarioRow): Working => ({
  key: s.key,
  name: s.name,
  kind: s.kind,
  startMonth: s.startMonth,
  horizonMonths: s.horizonMonths,
  assumptions: s.assumptions,
})

export function BusinessPlanWorkspace({
  scenarios,
  anchor,
  actuals,
  actualRows,
  currentMonth,
}: {
  scenarios: ScenarioRow[]
  anchor: { companies: number; caterings: number } | null
  actuals: ActualsSeriesPoint[]
  actualRows: ActualRow[]
  currentMonth: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const initial = scenarios.find((s) => s.isDefault) ?? scenarios[0]
  const [selectedKey, setSelectedKey] = useState(initial?.key ?? '')
  const [working, setWorking] = useState<Working | null>(initial ? toWorking(initial) : null)
  const [dirty, setDirty] = useState(false)

  const selectScenario = (key: string) => {
    const s = scenarios.find((x) => x.key === key)
    if (!s) return
    setSelectedKey(key)
    setWorking(toWorking(s))
    setDirty(false)
    setError(null)
  }

  const model = useMemo(() => {
    if (!working) return null
    return runModel(working.assumptions, working.startMonth, working.horizonMonths, anchor ?? undefined)
  }, [working, anchor])

  if (!working || !model) {
    return <p className="text-sm text-gray-500">No hay escenarios. Ejecuta el seed financiero.</p>
  }

  const setAssumptions = (a: Assumptions) => {
    setWorking((w) => (w ? { ...w, assumptions: a } : w))
    setDirty(true)
  }
  const setHorizon = (n: number) => {
    setWorking((w) => (w ? { ...w, horizonMonths: n } : w))
    setDirty(true)
  }

  const anchorAssumptions = () => {
    if (!anchor) return
    setWorking((w) => {
      if (!w) return w
      const next = structuredClone(w)
      next.assumptions.growth.startingCompanies = anchor.companies
      next.assumptions.growth.startingCaterings = anchor.caterings
      return next
    })
    setDirty(true)
  }

  const save = () => {
    setError(null)
    startTransition(async () => {
      const res = await saveScenarioAction({
        key: working.key,
        name: working.name,
        kind: working.kind,
        startMonth: working.startMonth,
        horizonMonths: working.horizonMonths,
        assumptions: working.assumptions,
      }).catch((e) => ({ error: e instanceof Error ? e.message : 'Error' }))
      if (res && 'error' in res && res.error) {
        setError(String(res.error))
        return
      }
      setDirty(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs">Escenario</Label>
            <Select value={selectedKey} onValueChange={selectScenario}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.name}
                    {s.isDefault ? ' · por defecto' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Mes inicio</Label>
            <Input value={working.startMonth} readOnly className="h-9 w-28" />
          </div>
          <div>
            <Label className="text-xs">Horizonte (meses)</Label>
            <Input
              type="number"
              min={12}
              max={60}
              value={working.horizonMonths}
              onChange={(e) => setHorizon(Math.min(60, Math.max(12, Number(e.target.value) || 36)))}
              className="h-9 w-24"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge variant="outline">sin guardar</Badge>}
          <Button onClick={save} disabled={isPending || !dirty}>
            <Save className="mr-2 h-4 w-4" />
            {isPending ? 'Guardando…' : 'Guardar escenario'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <Tabs defaultValue="projection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projection">Proyección P&amp;L</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="plan-vs-real">Plan vs Real</TabsTrigger>
          <TabsTrigger value="assumptions">Supuestos</TabsTrigger>
        </TabsList>

        <TabsContent value="projection">
          <ProjectionTab projection={model.projection} summary={model.summary} />
        </TabsContent>
        <TabsContent value="metrics">
          <MetricsTab metrics={model.metrics} />
        </TabsContent>
        <TabsContent value="plan-vs-real">
          <PlanVsRealTab
            projection={model.projection}
            actuals={actuals}
            actualRows={actualRows}
            currentMonth={currentMonth}
          />
        </TabsContent>
        <TabsContent value="assumptions">
          <AssumptionsTab
            value={working.assumptions}
            onChange={setAssumptions}
            onAnchor={anchorAssumptions}
            canAnchor={!!anchor}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
