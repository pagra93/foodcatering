'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export function NewIncidentForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [incidentType, setIncidentType] = useState('')
  const [severity, setSeverity] = useState('MEDIUM')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const data = {
        orderId: formData.get('orderId'),
        type: incidentType,
        severity: severity,
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

        {/* Tipo */}
        <div>
          <Label htmlFor="type">Tipo de Incidencia *</Label>
          <Select value={incidentType} onValueChange={setIncidentType} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DELAYED_DELIVERY">Entrega Retrasada</SelectItem>
              <SelectItem value="MISSING_ITEM">Falta Artículo</SelectItem>
              <SelectItem value="WRONG_ORDER">Pedido Incorrecto</SelectItem>
              <SelectItem value="QUALITY_ISSUE">Problema de Calidad</SelectItem>
              <SelectItem value="ALLERGEN_ISSUE">Problema de Alérgenos</SelectItem>
              <SelectItem value="DAMAGED_PACKAGING">Envase Dañado</SelectItem>
              <SelectItem value="OTHER">Otro</SelectItem>
            </SelectContent>
          </Select>
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
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}

