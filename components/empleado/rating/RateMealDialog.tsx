'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Star } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { rateDishesAction } from './actions'

type Course = 'FIRST' | 'SECOND' | 'DESSERT'

export type RateMealDish = { dishId: string; name: string; course: Course }

const COURSE_LABEL: Record<Course, string> = {
  FIRST: 'Primero',
  SECOND: 'Segundo',
  DESSERT: 'Postre',
}

function StarPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
          aria-pressed={value >= n ? 'true' : 'false'}
          className="rounded p-0.5 transition-transform hover:scale-110"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
        >
          <Star
            className={cn(
              'h-6 w-6',
              (hover || value) >= n
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300'
            )}
          />
        </button>
      ))}
    </div>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  serviceDate: Date | string
  dishes: RateMealDish[]
}

export function RateMealDialog({
  open,
  onOpenChange,
  orderId,
  serviceDate,
  dishes,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')

  const setScore = (dishId: string, v: number) =>
    setScores((prev) => ({ ...prev, [dishId]: v }))

  const rated = dishes.filter((d) => (scores[d.dishId] ?? 0) > 0)

  const submit = () => {
    if (rated.length === 0) {
      toast.error('Valora al menos un plato')
      return
    }
    startTransition(async () => {
      const res = await rateDishesAction({
        orderId,
        comment: comment.trim() || undefined,
        ratings: rated.map((d) => ({
          dishId: d.dishId,
          course: d.course,
          rating: scores[d.dishId]!,
        })),
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success('¡Gracias por tu valoración!')
      onOpenChange(false)
      setScores({})
      setComment('')
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valora tu comida</DialogTitle>
          <DialogDescription>
            {format(new Date(serviceDate), "EEEE, d 'de' MMMM", { locale: es })}{' '}
            · puntúa cada plato del 1 al 5.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {dishes.map((d) => (
            <div
              key={d.dishId}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs uppercase text-gray-400">
                  {COURSE_LABEL[d.course]}
                </p>
                <p className="truncate text-sm font-medium text-gray-900">
                  {d.name}
                </p>
              </div>
              <StarPicker
                value={scores[d.dishId] ?? 0}
                onChange={(v) => setScore(d.dishId, v)}
              />
            </div>
          ))}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Comentario (opcional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="¿Algo que destacar del menú de hoy?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isPending || rated.length === 0}>
            {isPending ? 'Enviando…' : 'Enviar valoración'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
