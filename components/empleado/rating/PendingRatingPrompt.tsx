'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RateMealDialog, type RateMealDish } from './RateMealDialog'

type PendingOrder = {
  orderId: string
  serviceDate: Date | string
  dishes: RateMealDish[]
}

/**
 * Aviso proactivo "Valora la comida de ayer": muestra el pedido entregado más
 * reciente sin valorar. Al enviarlo, `router.refresh()` recarga la portada y el
 * aviso desaparece (o pasa al siguiente pendiente en la próxima carga).
 */
export function PendingRatingPrompt({ pending }: { pending: PendingOrder[] }) {
  const [open, setOpen] = useState(false)
  const next = pending[0]
  if (!next) return null

  const dishNames = next.dishes.map((d) => d.name).join(' · ')

  return (
    <>
      <Card className="flex flex-col items-start justify-between gap-3 border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Star className="mt-0.5 h-5 w-5 shrink-0 fill-amber-400 text-amber-400" />
          <div>
            <p className="font-medium text-amber-900">
              Valora tu comida del{' '}
              {format(new Date(next.serviceDate), "d 'de' MMMM", { locale: es })}
            </p>
            <p className="text-sm text-amber-800">{dishNames}</p>
            {pending.length > 1 && (
              <p className="mt-0.5 text-xs text-amber-700">
                Tienes {pending.length} comidas por valorar.
              </p>
            )}
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0">
          Valorar ahora
        </Button>
      </Card>

      <RateMealDialog
        open={open}
        onOpenChange={setOpen}
        orderId={next.orderId}
        serviceDate={next.serviceDate}
        dishes={next.dishes}
      />
    </>
  )
}
