'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { AuditType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAuditAction } from './actions'

type CateringOption = { id: string; name: string; subdomain: string }

const TYPE_LABEL: Record<AuditType, string> = {
  SANITARIA: 'Sanitaria (Sanidad / APPCC)',
  OPERATIVA: 'Operativa (procesos, tiempos)',
  SATISFACCION: 'Satisfacción (NPS, encuestas)',
}

export function NewAuditForm({ caterings }: { caterings: CateringOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [tenantCatering, setTenantCatering] = useState(caterings[0]?.id ?? '')
  const [auditType, setAuditType] = useState<AuditType>('SANITARIA')
  const [score, setScore] = useState('85')
  const [auditedAt, setAuditedAt] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [reportUrl, setReportUrl] = useState('')
  const [notes, setNotes] = useState('')

  const reset = () => {
    setTenantCatering(caterings[0]?.id ?? '')
    setAuditType('SANITARIA')
    setScore('85')
    setAuditedAt(new Date().toISOString().slice(0, 10))
    setReportUrl('')
    setNotes('')
    setOpen(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        const scoreNum = Number(score)
        if (!Number.isInteger(scoreNum) || scoreNum < 0 || scoreNum > 100) {
          toast.error('Score debe ser 0-100')
          return
        }
        await createAuditAction({
          tenantCatering,
          auditType,
          score: scoreNum,
          auditedAt: new Date(auditedAt),
          reportUrl: reportUrl || undefined,
          notes: notes || undefined,
        })
        toast.success('Auditoría registrada')
        reset()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>+ Nueva auditoría</Button>
      </div>
    )
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <h3 className="text-base font-semibold">Nueva auditoría</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="tenantCatering">Catering</Label>
            <select
              id="tenantCatering"
              value={tenantCatering}
              onChange={(e) => setTenantCatering(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              required
            >
              {caterings.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.subdomain})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="auditType">Tipo</Label>
            <select
              id="auditType"
              value={auditType}
              onChange={(e) => setAuditType(e.target.value as AuditType)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              required
            >
              {(Object.keys(TYPE_LABEL) as AuditType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="score">Score (0-100)</Label>
            <Input
              id="score"
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="auditedAt">Fecha auditoría</Label>
            <Input
              id="auditedAt"
              type="date"
              value={auditedAt}
              onChange={(e) => setAuditedAt(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="reportUrl">URL informe PDF (opcional)</Label>
            <Input
              id="reportUrl"
              type="url"
              value={reportUrl}
              onChange={(e) => setReportUrl(e.target.value)}
              placeholder="https://drive.google.com/file/..."
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              rows={3}
              placeholder="Observaciones, áreas a mejorar…"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button type="button" variant="ghost" onClick={reset}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Guardando…' : 'Registrar'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
