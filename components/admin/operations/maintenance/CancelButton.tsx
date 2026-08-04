'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cancelMaintenanceAction } from './actions'

export function CancelMaintenanceButton({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const cancel = () => {
    if (!confirm('¿Cancelar esta ventana de mantenimiento?')) return
    startTransition(async () => {
      const res = await cancelMaintenanceAction({ id })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Ventana cancelada')
      router.refresh()
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cancel}
      disabled={isPending}
      className="text-red-600 hover:bg-red-50"
    >
      <X className="h-4 w-4" />
    </Button>
  )
}
