'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import type { PenaltyStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { applyPenaltyAction, waivePenaltyAction } from './actions'

type Props = {
  penaltyId: string
  status: PenaltyStatus
  amount: number
  cateringName: string
}

/** Acciones del ciclo de vida de una penalización (aplicar / perdonar). */
export function PenaltyDetailActions({
  penaltyId,
  status,
  amount,
  cateringName,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const apply = () => {
    if (
      !confirm(
        `¿Aplicar penalización de ${amount.toFixed(2)}€ a ${cateringName}? Se descontará en la liquidación.`
      )
    )
      return
    startTransition(async () => {
      const res = await applyPenaltyAction({ penaltyId })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Penalización aplicada')
      router.refresh()
    })
  }

  const waive = () => {
    const reason = prompt('Motivo para perdonar la penalización:')
    if (!reason || reason.length < 5) return
    startTransition(async () => {
      const res = await waivePenaltyAction({ penaltyId, reason })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Penalización perdonada')
      router.refresh()
    })
  }

  if (status === 'WAIVED') {
    return (
      <p className="text-sm text-gray-500">
        Esta penalización está perdonada (estado final). No hay más acciones.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(status === 'PENDING' || status === 'DISPUTED') && (
        <Button onClick={apply} disabled={isPending}>
          <Check className="mr-2 h-4 w-4" />
          {status === 'DISPUTED' ? 'Mantener y aplicar' : 'Aplicar'}
        </Button>
      )}
      <Button variant="outline" onClick={waive} disabled={isPending}>
        <X className="mr-2 h-4 w-4" />
        Perdonar
      </Button>
    </div>
  )
}
