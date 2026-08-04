'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { scheduleMaintenanceAction } from './actions'

function defaultStart() {
  const d = new Date(Date.now() + 60 * 60 * 1000) // en 1h
  return d.toISOString().slice(0, 16)
}
function defaultEnd() {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2h después
  return d.toISOString().slice(0, 16)
}

export function ScheduleForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [startsAt, setStartsAt] = useState(defaultStart())
  const [endsAt, setEndsAt] = useState(defaultEnd())
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState(
    'Estamos realizando una actualización. Volveremos en breve.'
  )

  const reset = () => {
    setStartsAt(defaultStart())
    setEndsAt(defaultEnd())
    setReason('')
    setMessage('Estamos realizando una actualización. Volveremos en breve.')
    setOpen(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await scheduleMaintenanceAction({
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        reason,
        message,
        allowedRoles: ['SUPER_ADMIN'],
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Ventana programada')
      reset()
      router.refresh()
    })
  }

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>+ Programar ventana</Button>
      </div>
    )
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <h3 className="text-base font-semibold">Nueva ventana de mantenimiento</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="startsAt">Inicio</Label>
            <Input
              id="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="endsAt">Fin</Label>
            <Input
              id="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="reason">Motivo (interno)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Migración de BD, actualización Next.js, etc."
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="message">Mensaje público</Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              rows={3}
              required
              maxLength={1000}
            />
            <p className="mt-1 text-xs text-gray-500">
              Lo verán todos los usuarios que intenten entrar durante la
              ventana. SUPER_ADMIN sigue pasando.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button type="button" variant="ghost" onClick={reset}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Guardando…' : 'Programar'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
