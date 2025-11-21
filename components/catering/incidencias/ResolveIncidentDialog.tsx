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
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Incident = {
  id: string
  typeLabel: string
  typeIcon: string
  companyName: string
  employeeName: string | null
  employeeEmail: string | null
  order: {
    serviceDate: Date
    selection: any
  } | null
}

type ResolveIncidentDialogProps = {
  incident: Incident
  isOpen: boolean
  onClose: () => void
}

const RESOLUTION_TYPES = {
  REPLACEMENT: 'Reemplazo de producto',
  REFUND: 'Reembolso',
  DISCOUNT: 'Descuento en próximo pedido',
  APOLOGY: 'Disculpa sin compensación',
  OTHER: 'Otra solución',
}

export function ResolveIncidentDialog({
  incident,
  isOpen,
  onClose,
}: ResolveIncidentDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [resolutionType, setResolutionType] = useState<string>('')
  const [resolutionDetails, setResolutionDetails] = useState<string>('')
  const [compensationAmount, setCompensationAmount] = useState<string>('')
  const [status, setStatus] = useState<'IN_PROGRESS' | 'RESOLVED'>('IN_PROGRESS')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!resolutionType || !resolutionDetails) {
      toast.error('Por favor completa todos los campos obligatorios')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/catering/incidencias/${incident.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          resolutionType,
          resolutionDetails,
          compensationAmount: compensationAmount ? parseFloat(compensationAmount) : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al resolver la incidencia')
      }

      toast.success('Incidencia actualizada correctamente', {
        description: 'El empleado recibirá una notificación con tu respuesta',
      })

      onClose()
      router.refresh()
    } catch (error) {
      console.error('Error al resolver incidencia:', error)
      toast.error('Error al actualizar la incidencia', {
        description: 'Por favor intenta de nuevo',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selection = incident.order?.selection as any

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {incident.typeIcon} Responder Incidencia
          </DialogTitle>
          <DialogDescription>
            Proporciona una solución al problema reportado por el empleado
          </DialogDescription>
        </DialogHeader>

        {/* Información de la incidencia */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <h4 className="font-medium">{incident.typeLabel}</h4>
          <div className="text-sm space-y-1">
            <p>
              <span className="text-gray-600">Empresa:</span> {incident.companyName}
            </p>
            <p>
              <span className="text-gray-600">Empleado:</span> {incident.employeeName}
            </p>
            {incident.order && (
              <>
                <p>
                  <span className="text-gray-600">Fecha del pedido:</span>{' '}
                  {format(new Date(incident.order.serviceDate), "d 'de' MMMM", {
                    locale: es,
                  })}
                </p>
                <p>
                  <span className="text-gray-600">Primer plato:</span>{' '}
                  {selection?.first?.name || 'N/A'}
                </p>
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Estado */}
          <div className="space-y-3">
            <Label>Estado de la incidencia</Label>
            <RadioGroup value={status} onValueChange={(v: any) => setStatus(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="IN_PROGRESS" id="in_progress" />
                <Label htmlFor="in_progress" className="cursor-pointer">
                  🔄 En Revisión (estamos trabajando en ello)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="RESOLVED" id="resolved" />
                <Label htmlFor="resolved" className="cursor-pointer">
                  ✅ Resuelta (problema solucionado)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Tipo de Resolución */}
          <div className="space-y-2">
            <Label htmlFor="resolutionType">Tipo de solución *</Label>
            <Select value={resolutionType} onValueChange={setResolutionType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de solución..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESOLUTION_TYPES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Detalles de la Resolución */}
          <div className="space-y-2">
            <Label htmlFor="resolutionDetails">
              Detalles de la solución *
            </Label>
            <Textarea
              id="resolutionDetails"
              value={resolutionDetails}
              onChange={(e) => setResolutionDetails(e.target.value)}
              placeholder="Explica cómo vas a resolver o has resuelto el problema..."
              rows={5}
              required
            />
            <p className="text-sm text-gray-500">
              Este mensaje será visible para el empleado
            </p>
          </div>

          {/* Compensación (opcional) */}
          {(resolutionType === 'REFUND' || resolutionType === 'DISCOUNT') && (
            <div className="space-y-2">
              <Label htmlFor="compensationAmount">
                Cantidad de compensación (€)
              </Label>
              <Input
                id="compensationAmount"
                type="number"
                step="0.01"
                min="0"
                value={compensationAmount}
                onChange={(e) => setCompensationAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-sm text-gray-500">
                Deja en blanco si no aplica compensación monetaria
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !resolutionType || !resolutionDetails}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Enviar Respuesta'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

