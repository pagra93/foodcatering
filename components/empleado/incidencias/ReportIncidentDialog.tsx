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
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { INCIDENT_TYPES } from '@/lib/db/queries/empleado-incidencias'
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

type ReportIncidentDialogProps = {
  isOpen: boolean
  onClose: () => void
  orders: Order[]
}

export function ReportIncidentDialog({
  isOpen,
  onClose,
  orders,
}: ReportIncidentDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('MEDIUM')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedOrderId || !selectedType) {
      toast.error('Por favor completa todos los campos')
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
          type: selectedType,
          severity: selectedSeverity,
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
      setSelectedType('')
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

          {/* Tipo de Incidencia */}
          <div className="space-y-3">
            <Label>¿Cuál es el problema?</Label>
            <RadioGroup value={selectedType} onValueChange={setSelectedType}>
              <div className="space-y-3">
                {Object.entries(INCIDENT_TYPES).map(([key, value]) => (
                  <div key={key} className="flex items-start space-x-3">
                    <RadioGroupItem value={key} id={key} className="mt-1" />
                    <Label htmlFor={key} className="cursor-pointer flex-1">
                      <div className="flex items-start gap-2">
                        <span className="text-xl">{value.icon}</span>
                        <div>
                          <p className="font-medium">{value.label}</p>
                          <p className="text-sm text-gray-500">{value.description}</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
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
            <Button type="submit" disabled={isLoading || !selectedOrderId || !selectedType}>
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

