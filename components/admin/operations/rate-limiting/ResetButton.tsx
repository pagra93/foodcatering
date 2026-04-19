'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resetRateLimiterKeyAction } from './actions'

export function ResetLimiterKeyButton({
  limiter,
  limiterKey,
}: {
  limiter: string
  limiterKey: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const reset = () => {
    if (!confirm(`¿Resetear la ventana de rate limit para "${limiterKey}"?`))
      return
    startTransition(async () => {
      try {
        await resetRateLimiterKeyAction({ limiter, key: limiterKey })
        toast.success('Ventana reseteada')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={reset}
      disabled={isPending}
      title="Resetear manualmente"
    >
      <RefreshCw className="h-4 w-4" />
    </Button>
  )
}
