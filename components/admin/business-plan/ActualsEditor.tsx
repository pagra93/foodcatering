'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, Save } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ActualRow } from '@/lib/db/queries/admin-business-plan'
import { saveActualsAction, captureMrrSnapshotAction } from './actions'

const num = (v: string) => (v === '' ? null : Number(v))
const str = (n: number | null) => (n == null ? '' : String(n))

type FormState = {
  cogsHosting: string
  cogsPayments: string
  cogsSupport: string
  opexSales: string
  opexRnd: string
  opexGna: string
  headcount: string
}

const formFrom = (r?: ActualRow): FormState => ({
  cogsHosting: str(r?.cogsHosting ?? null),
  cogsPayments: str(r?.cogsPayments ?? null),
  cogsSupport: str(r?.cogsSupport ?? null),
  opexSales: str(r?.opexSales ?? null),
  opexRnd: str(r?.opexRnd ?? null),
  opexGna: str(r?.opexGna ?? null),
  headcount: str(r?.headcount ?? null),
})

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={100} value={value} onChange={(e) => onChange(e.target.value)} className="h-8" placeholder="—" />
    </div>
  )
}

/** Introduce los costes REALES de un mes (para el P&L real) + captura snapshot MRR. */
export function ActualsEditor({ rows, currentMonth }: { rows: ActualRow[]; currentMonth: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState(currentMonth)
  const [form, setForm] = useState<FormState>(() => formFrom(rows.find((r) => r.period === currentMonth)))

  const load = (p: string) => {
    setPeriod(p)
    setForm(formFrom(rows.find((x) => x.period === p)))
  }

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const save = () => {
    setError(null)
    startTransition(async () => {
      const res = await saveActualsAction({
        period,
        cogsHosting: num(form.cogsHosting),
        cogsPayments: num(form.cogsPayments),
        cogsSupport: num(form.cogsSupport),
        opexSales: num(form.opexSales),
        opexRnd: num(form.opexRnd),
        opexGna: num(form.opexGna),
        headcount: num(form.headcount),
      }).catch((e) => ({ error: e instanceof Error ? e.message : 'Error' }))
      if (res && 'error' in res && res.error) {
        setError(String(res.error))
        return
      }
      router.refresh()
    })
  }

  const capture = () =>
    startTransition(async () => {
      try {
        const res = await captureMrrSnapshotAction()
        if (res.error) {
          toast.error(`No se pudo capturar el snapshot MRR: ${res.error}`)
          return
        }
        router.refresh()
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : 'No se pudo capturar el snapshot MRR.'
        )
      }
    })

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Costes reales del mes</h3>
          <p className="text-xs text-gray-500">
            Introduce los costes reales de Plati (no hay contabilidad conectada). Alimentan el P&amp;L
            real y la rentabilidad vs plan.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={capture} disabled={isPending}>
          <Camera className="mr-2 h-4 w-4" />
          Capturar snapshot MRR (hoy)
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <Label className="text-xs">Mes</Label>
          <Input type="month" value={period} onChange={(e) => load(e.target.value)} className="h-8" />
        </div>
        <Field label="Hosting" value={form.cogsHosting ?? ''} onChange={(v) => set('cogsHosting', v)} />
        <Field label="Procesamiento pago" value={form.cogsPayments ?? ''} onChange={(v) => set('cogsPayments', v)} />
        <Field label="Soporte" value={form.cogsSupport ?? ''} onChange={(v) => set('cogsSupport', v)} />
        <Field label="Marketing / S&M" value={form.opexSales ?? ''} onChange={(v) => set('opexSales', v)} />
        <Field label="Ingeniería / R&D" value={form.opexRnd ?? ''} onChange={(v) => set('opexRnd', v)} />
        <Field label="G&A" value={form.opexGna ?? ''} onChange={(v) => set('opexGna', v)} />
        <Field label="Headcount" value={form.headcount ?? ''} onChange={(v) => set('headcount', v)} />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-3">
        <Button size="sm" onClick={save} disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? 'Guardando…' : 'Guardar costes del mes'}
        </Button>
      </div>
    </Card>
  )
}
