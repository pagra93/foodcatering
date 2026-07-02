'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Prisma } from '@prisma/client'

type Order = {
  id: string
  serviceDate: Date
  selection: Prisma.JsonValue
  price: Prisma.Decimal | number
  status: string
}

type ReasonOption = {
  id: string
  name: string
  defaultSeverity: 'LOW' | 'MEDIUM' | 'HIGH'
  requiresCompensation: boolean
}

type ReportIncidentDialogProps = {
  isOpen: boolean
  onClose: () => void
  orders: Order[]
  reasons: ReasonOption[]
}

export function ReportIncidentDialog({
  isOpen,
  onClose,
  orders,
  reasons,
}: ReportIncidentDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [selectedReasonId, setSelectedReasonId] = useState<string>('')
  const [subject, setSubject] = useState<string>('')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('MEDIUM')

  const selectedReason = reasons.find((r) => r.id === selectedReasonId)

  const changeReason = (id: string) => {
    setSelectedReasonId(id)
    const r = reasons.find((x) => x.id === id)
    if (r) setSelectedSeverity(r.defaultSeverity)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedOrderId || !selectedReasonId) {
      toast.error('Selecciona el pedido y el motivo')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/empleado/incidencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrderId,
          reasonId: selectedReasonId,
          severity: selectedSeverity,
          subject: subject.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al crear la incidencia')
      }

      toast.success('Incidencia reportada correctamente', {
        description: 'El catering revisará tu reporte y te responderá pronto',
      })

      // Reset form
      setSelectedOrderId('')
      setSelectedReasonId('')
      setSubject('')
      setSelectedSeverity('MEDIUM')

      onClose()
      router.refresh()
    } catch (error) {
      console.error('Error al crear incidencia:', error)
      toast.error('Error al reportar la incidencia', {
        description: 'Por favor intenta de nuevo',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedOrder = orders.find((o) => o.id === selectedOrderId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reportar Incidencia</DialogTitle>
          <DialogDescription>
            Cuéntanos qué pasó con tu pedido. El catering revisará tu reporte y te
            responderá.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Seleccionar Pedido */}
          <div className="space-y-2">
            <Label htmlFor="order">Selecciona el pedido con problema</Label>
            <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
              <SelectTrigger>
                <SelectValue placeholder="Elige un pedido..." />
              </SelectTrigger>
              <SelectContent>
                {orders.map((order) => {
                  const selection = order.selection as any
                  const firstDish = selection?.first?.name || 'Sin información'

                  return (
                    <SelectItem key={order.id} value={order.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {format(new Date(order.serviceDate), "d 'de' MMMM", {
                            locale: es,
                          })}
                        </span>
                        <span className="text-sm text-gray-500">{firstDish}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Mostrar detalles del pedido seleccionado */}
          {selectedOrder && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Detalles del pedido</h4>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-gray-600">Fecha:</span>{' '}
                  {format(new Date(selectedOrder.serviceDate), "d 'de' MMMM", {
                    locale: es,
                  })}
                </p>
                <p>
                  <span className="text-gray-600">Primer plato:</span>{' '}
                  {(selectedOrder.selection as any)?.first?.name || 'N/A'}
                </p>
                <p>
                  <span className="text-gray-600">Segundo plato:</span>{' '}
                  {(selectedOrder.selection as any)?.second?.name || 'N/A'}
                </p>
                <p>
                  <span className="text-gray-600">Postre:</span>{' '}
                  {(selectedOrder.selection as any)?.dessert?.name || 'N/A'}
                </p>
              </div>
            </div>
          )}

          {/* Motivo (del catálogo) */}
          <div className="space-y-2">
            <Label htmlFor="reason">¿Cuál es el problema?</Label>
            <Select value={selectedReasonId} onValueChange={changeReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Elige un motivo..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedReason?.requiresCompensation && (
              <p className="text-xs text-amber-700">
                Este motivo suele conllevar compensación.
              </p>
            )}
          </div>

          {/* Asunto opcional */}
          <div className="space-y-2">
            <Label htmlFor="subject">Asunto (opcional)</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              placeholder="Título corto, ej: Pizza llegó fría y tarde"
            />
          </div>

          {/* Severidad */}
          <div className="space-y-3">
            <Label>¿Qué tan grave es el problema?</Label>
            <RadioGroup
              value={selectedSeverity}
              onValueChange={setSelectedSeverity}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="LOW" id="low" />
                <Label htmlFor="low" className="cursor-pointer">
                  🟢 Leve (molestia menor)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="MEDIUM" id="medium" />
                <Label htmlFor="medium" className="cursor-pointer">
                  🟡 Moderado (afecta la experiencia)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="HIGH" id="high" />
                <Label htmlFor="high" className="cursor-pointer">
                  🔴 Grave (problema serio)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !selectedOrderId || !selectedReasonId}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Reportar Incidencia'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

