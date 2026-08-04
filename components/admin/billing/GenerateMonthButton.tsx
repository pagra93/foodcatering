'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlayCircle, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { generateMonthBillingAction } from './actions'

function previousMonth(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function GenerateMonthButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [period, setPeriod] = useState(previousMonth())

  const run = (dryRun: boolean) => {
    if (
      !dryRun &&
      !confirm(
        `Se van a generar las liquidaciones catering→Plati y las facturas SaaS Plati→empresa del período ${period}. Los documentos del mismo período que ya existan se saltan. ¿Continuar?`
      )
    )
      return

    startTransition(async () => {
      const res = await generateMonthBillingAction({ period, dryRun })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      const r = res.data
      const prefix = r.dryRun ? '(simulación)' : ''
      toast.success(
        `${prefix} Liquidaciones: ${r.settlementsCreated} creadas / ${r.settlementsSkipped} saltadas. SaaS: ${r.saasCreated} / ${r.saasSkipped}.`,
        { duration: 6000 }
      )
      if (!r.dryRun) router.refresh()
    })
  }

  return (
    <Card className="bg-gray-50/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Wand2 className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          Generación mensual
        </span>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => run(true)}
        >
          Simular
        </Button>
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => run(false)}
          className="gap-1.5"
        >
          <PlayCircle className="h-4 w-4" />
          Generar
        </Button>
        <p className="text-xs text-gray-500">
          Crea Settlements y SaasInvoices del período indicado (idempotente).
        </p>
      </div>
    </Card>
  )
}
