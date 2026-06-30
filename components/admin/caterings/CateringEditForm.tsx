'use client'

/**
 * Formulario de edición de un catering (FormData + server action).
 * Patrón espejo de CompanyForm (Empresas).
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

const DAYS = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
]

export type CateringEditInitialData = {
  name: string
  contactEmail: string
  contactPhone: string
  primaryColor: string
  logoUrl: string
  legalName: string
  billingAddress: string
  iban: string
  contactPerson: string
  restaurantContactEmail: string
  restaurantContactPhone: string
  dailyCapacity: number
  cutoffTime: string
  commission: number
  operationalDays: string[]
}

type Props = {
  action: (formData: FormData) => Promise<{ error?: string } | void>
  initialData: CateringEditInitialData
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
}: {
  label: string
  name: string
  defaultValue?: string | number
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  )
}

export function CateringEditForm({ action, initialData }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState<string[]>(initialData.operationalDays ?? [])

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await action(formData)
      if (result && 'error' in result && result.error) {
        setError(result.error)
        setIsSubmitting(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
      setIsSubmitting(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Datos generales</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre" name="name" defaultValue={initialData.name} required />
          <Field label="Persona de contacto" name="contactPerson" defaultValue={initialData.contactPerson} />
          <Field label="Email de contacto" name="contactEmail" type="email" defaultValue={initialData.contactEmail} />
          <Field label="Teléfono de contacto" name="contactPhone" defaultValue={initialData.contactPhone} />
          <Field label="Color de marca" name="primaryColor" defaultValue={initialData.primaryColor} />
          <Field label="Logo (URL)" name="logoUrl" defaultValue={initialData.logoUrl} />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Datos legales y bancarios</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Razón social" name="legalName" defaultValue={initialData.legalName} required />
          <Field label="Dirección de facturación" name="billingAddress" defaultValue={initialData.billingAddress} required />
          <Field label="IBAN" name="iban" defaultValue={initialData.iban} />
          <Field label="Email del restaurante" name="restaurantContactEmail" type="email" defaultValue={initialData.restaurantContactEmail} />
          <Field label="Teléfono del restaurante" name="restaurantContactPhone" defaultValue={initialData.restaurantContactPhone} />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Operación y económico</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Capacidad diaria (platos)" name="dailyCapacity" type="number" defaultValue={initialData.dailyCapacity} />
          <Field label="Hora de cutoff (HH:mm)" name="cutoffTime" defaultValue={initialData.cutoffTime} />
          <Field label="Comisión (0–1, ej. 0.05)" name="commission" type="number" defaultValue={initialData.commission} />
        </div>
        <div>
          <Label>Días operativos</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {DAYS.map((d) => (
              <label key={d.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={days.includes(d.value)}
                  onCheckedChange={(c) =>
                    setDays((prev) =>
                      c ? [...prev, d.value] : prev.filter((x) => x !== d.value)
                    )
                  }
                />
                {d.label}
              </label>
            ))}
          </div>
          {days.map((d) => (
            <input key={d} type="hidden" name="operationalDays" value={d} />
          ))}
        </div>
      </Card>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => window.history.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
