'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { AuditType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import { updateAuditAction, deleteAuditAction } from './actions'

const TYPE_LABEL: Record<AuditType, string> = {
  SANITARIA: 'Sanitaria (Sanidad / APPCC)',
  OPERATIVA: 'Operativa (procesos, tiempos)',
  SATISFACCION: 'Satisfacción (NPS, encuestas)',
}

type Props = {
  audit: {
    id: string
    auditType: AuditType
    score: number
    auditedAt: Date
    reportUrl: string | null
    notes: string | null
  }
}

export function AuditDetailForm({ audit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [auditType, setAuditType] = useState<AuditType>(audit.auditType)
  const [score, setScore] = useState(String(audit.score))
  const [auditedAt, setAuditedAt] = useState(
    new Date(audit.auditedAt).toISOString().slice(0, 10)
  )
  const [reportUrl, setReportUrl] = useState(audit.reportUrl ?? '')
  const [notes, setNotes] = useState(audit.notes ?? '')

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        const scoreNum = Number(score)
        if (!Number.isInteger(scoreNum) || scoreNum < 0 || scoreNum > 100) {
          toast.error('Score debe ser 0-100')
          return
        }
        await updateAuditAction({
          auditId: audit.id,
          auditType,
          score: scoreNum,
          auditedAt: new Date(auditedAt),
          reportUrl: reportUrl || undefined,
          notes: notes || undefined,
        })
        toast.success('Auditoría actualizada')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const remove = () => {
    if (!confirm('¿Eliminar esta auditoría? Esta acción no se puede deshacer.')) return
    startTransition(async () => {
      try {
        await deleteAuditAction({ auditId: audit.id })
        toast.success('Auditoría eliminada')
        router.push('/admin/quality/audits')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  return (
    <Card className="p-6">
      <form onSubmit={save} className="space-y-4">
        <h3 className="text-base font-semibold">Editar auditoría</h3>

        <div className="grid gap-4 md:grid-cols-2">
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

        <div className="flex items-center justify-between border-t pt-3">
          <Button
            type="button"
            variant="outline"
            className="text-red-600"
            onClick={remove}
            disabled={isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
