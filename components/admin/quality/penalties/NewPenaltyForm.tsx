'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { PenaltyType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DISPUTE_WINDOW_DAYS } from '@/lib/validations/penalty'
import { createPenaltyAction } from './actions'

type CateringOption = { id: string; name: string; subdomain: string }
type OriginOption = { id: string; label: string; tenantCatering: string }

const TYPE_OPTIONS: { value: PenaltyType; label: string }[] = [
  { value: 'MANUAL', label: 'Manual (caso puntual)' },
  { value: 'SLA_BREACH', label: 'Incumplimiento de SLA' },
  { value: 'DOC_EXPIRED', label: 'Documentación caducada' },
  { value: 'INCIDENT_THRESHOLD', label: 'Umbral de incidencias superado' },
]

export function NewPenaltyForm({
  caterings,
  incidents = [],
  audits = [],
}: {
  caterings: CateringOption[]
  incidents?: OriginOption[]
  audits?: OriginOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [tenantCatering, setTenantCatering] = useState(caterings[0]?.id ?? '')
  const [type, setType] = useState<PenaltyType>('MANUAL')
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [linkedIncidentId, setLinkedIncidentId] = useState('')
  const [linkedAuditId, setLinkedAuditId] = useState('')

  // Origen filtrado por el catering seleccionado.
  const catIncidents = incidents.filter((i) => i.tenantCatering === tenantCatering)
  const catAudits = audits.filter((a) => a.tenantCatering === tenantCatering)

  const changeCatering = (id: string) => {
    setTenantCatering(id)
    setLinkedIncidentId('')
    setLinkedAuditId('')
  }

  const reset = () => {
    setTenantCatering(caterings[0]?.id ?? '')
    setType('MANUAL')
    setReason('')
    setAmount('')
    setNotes('')
    setLinkedIncidentId('')
    setLinkedAuditId('')
    setOpen(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const n = Number(amount)
      if (!Number.isFinite(n) || n <= 0) {
        toast.error('Importe inválido')
        return
      }
      const res = await createPenaltyAction({
        tenantCatering,
        type,
        reason,
        amount: n,
        notes: notes || undefined,
        linkedIncidentId: linkedIncidentId || undefined,
        linkedAuditId: linkedAuditId || undefined,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Penalización creada en estado PENDING')
      reset()
      router.refresh()
    })
  }

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>+ Nueva penalización</Button>
      </div>
    )
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <h3 className="text-base font-semibold">Nueva penalización</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="tenantCatering">Catering</Label>
            <select
              id="tenantCatering"
              value={tenantCatering}
              onChange={(e) => changeCatering(e.target.value)}
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
            <Label htmlFor="type">Tipo</Label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as PenaltyType)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              required
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="amount">Importe (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="reason">Motivo (público para el catering)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Ej: 15 entregas fuera de ventana en abril 2026"
            />
          </div>
          {/* Origen (opcional): vincula la penalización a una incidencia o auditoría del catering */}
          <div>
            <Label htmlFor="linkedIncident">Incidencia de origen (opcional)</Label>
            <select
              id="linkedIncident"
              aria-label="Incidencia de origen"
              value={linkedIncidentId}
              onChange={(e) => setLinkedIncidentId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              disabled={catIncidents.length === 0}
            >
              <option value="">— ninguna —</option>
              {catIncidents.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="linkedAudit">Auditoría de origen (opcional)</Label>
            <select
              id="linkedAudit"
              aria-label="Auditoría de origen"
              value={linkedAuditId}
              onChange={(e) => setLinkedAuditId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              disabled={catAudits.length === 0}
            >
              <option value="">— ninguna —</option>
              {catAudits.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notas internas (solo Plati)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Queda en estado <strong>PENDING</strong>. Revisa y pulsa &quot;Aplicar&quot;
          cuando estés listo. El catering tendrá {DISPUTE_WINDOW_DAYS} días para disputarla.
        </p>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button type="button" variant="ghost" onClick={reset}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Creando…' : 'Crear'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
