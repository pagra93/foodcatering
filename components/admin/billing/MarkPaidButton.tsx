'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  markSaasInvoicePaidAction,
  markSettlementPaidAction,
} from './actions'

export function MarkPaidButton({
  id,
  kind,
}: {
  id: string
  kind: 'settlement' | 'saas-invoice'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const mark = () => {
    const ref = prompt('Referencia de la transferencia (opcional):')
    if (ref === null) return

    startTransition(async () => {
      try {
        if (kind === 'settlement') {
          await markSettlementPaidAction({ id, paymentRef: ref || undefined })
        } else {
          await markSaasInvoicePaidAction({ id, paymentRef: ref || undefined })
        }
        toast.success('Marcada como pagada')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  return (
    <Button variant="ghost" size="sm" onClick={mark} disabled={isPending}>
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    </Button>
  )
}
