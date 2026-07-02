'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

type ReasonOption = {
  id: string
  name: string
  defaultSeverity: 'LOW' | 'MEDIUM' | 'HIGH'
  requiresCompensation: boolean
}

export function NewIncidentForm({ reasons }: { reasons: ReasonOption[] }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reasonId, setReasonId] = useState('')
  const [severity, setSeverity] = useState('MEDIUM')

  const selectedReason = reasons.find((r) => r.id === reasonId)
  const changeReason = (id: string) => {
    setReasonId(id)
    const r = reasons.find((x) => x.id === id)
    if (r) setSeverity(r.defaultSeverity)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const data = {
        orderId: formData.get('orderId'),
        reasonId,
        severity: severity,
        subject: (formData.get('subject') as string) || undefined,
        description: formData.get('description'),
      }

      const res = await fetch('/api/empresa/incidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al crear incidencia')
      }

      toast.success('Incidencia creada correctamente')
      router.push('/empresa/incidencias')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Error al crear incidencia')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Pedido */}
        <div>
          <Label htmlFor="orderId">ID de Pedido *</Label>
          <Input
            id="orderId"
            name="orderId"
            required
            placeholder="UUID del pedido"
          />
          <p className="text-xs text-muted-foreground mt-1">
            ID del pedido relacionado con la incidencia
          </p>
        </div>

        {/* Motivo (del catálogo) */}
        <div>
          <Label htmlFor="reason">Motivo de la incidencia *</Label>
          <Select value={reasonId} onValueChange={changeReason} required>
            <SelectTrigger id="reason">
              <SelectValue placeholder="Selecciona un motivo" />
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
            <p className="text-xs text-amber-700 mt-1">
              Este motivo suele conllevar compensación al empleado.
            </p>
          )}
        </div>

        {/* Asunto */}
        <div>
          <Label htmlFor="subject">Asunto (opcional)</Label>
          <Input
            id="subject"
            name="subject"
            maxLength={120}
            placeholder="Título corto de la incidencia"
          />
        </div>

        {/* Severidad */}
        <div>
          <Label htmlFor="severity">Severidad *</Label>
          <Select value={severity} onValueChange={setSeverity} required>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Baja</SelectItem>
              <SelectItem value="MEDIUM">Media</SelectItem>
              <SelectItem value="HIGH">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Descripción */}
        <div>
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            name="description"
            rows={5}
            placeholder="Describe el problema en detalle..."
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando...' : 'Crear Incidencia'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          asChild
        >
          <Link href="/empresa/incidencias">
            Cancelar
          </Link>
        </Button>
      </div>
    </form>
  )
}

