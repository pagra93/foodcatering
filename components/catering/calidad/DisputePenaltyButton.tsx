'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { disputePenaltyAction } from '@/components/admin/quality/penalties/actions'

export function DisputePenaltyButton({ penaltyId }: { penaltyId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (reason.length < 10) {
      toast.error('Explica los motivos con al menos 10 caracteres')
      return
    }
    startTransition(async () => {
      try {
        await disputePenaltyAction({ penaltyId, reason })
        toast.success('Disputa enviada. SinTupper revisará tu caso.')
        setOpen(false)
        setReason('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Disputar
      </Button>
    )
  }

  return (
    <Card className="absolute right-4 z-10 w-96 p-4 shadow-xl">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor={`dispute-${penaltyId}`} className="text-sm">
            Motivos de la disputa
          </Label>
          <textarea
            id={`dispute-${penaltyId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Explica por qué consideras que la penalización no es correcta…"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            SinTupper revisará tu caso. Mientras tanto, el descuento queda
            pausado.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false)
              setReason('')
            }}
          >
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Enviando…' : 'Enviar disputa'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
