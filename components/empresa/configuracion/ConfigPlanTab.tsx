'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, Euro, Clock } from 'lucide-react'

// Schema según modelo real CompanyPolicy
const planSchema = z.object({
  limitPerDay: z.coerce.number().positive('Debe ser mayor a 0').max(11, 'Máximo 11€ para deducción fiscal'),
  copayCompany: z.coerce.number().min(0, 'Debe ser mayor o igual a 0'),
  copayEmployee: z.coerce.number().min(0, 'Debe ser mayor o igual a 0'),
  cutoffTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato HH:MM'),
  noShowRule: z.enum(['CHARGE', 'NO_CHARGE', 'PARTIAL']),
  daysActive: z.array(z.string()).min(1, 'Selecciona al menos un día'),
  changeReason: z.string().min(10, 'Explica la razón del cambio (mín. 10 caracteres)'),
})

type PlanFormData = z.infer<typeof planSchema>

type ConfigPlanTabProps = {
  policy: {
    limitPerDay: number
    copayCompany: number
    copayEmployee: number
    cutoffTime: string
    daysActive: string[] // JSON parseado
    noShowRule: 'CHARGE' | 'NO_CHARGE' | 'PARTIAL'
    version: number
  } | null
}

const daysOfWeek = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
]

export function ConfigPlanTab({ policy }: ConfigPlanTabProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isDirty },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: policy
      ? {
          limitPerDay: Number(policy.limitPerDay),
          copayCompany: Number(policy.copayCompany),
          copayEmployee: Number(policy.copayEmployee),
          cutoffTime: policy.cutoffTime,
          daysActive: policy.daysActive,
          noShowRule: policy.noShowRule,
          changeReason: '',
        }
      : {
          limitPerDay: 11,
          copayCompany: 11,
          copayEmployee: 0,
          cutoffTime: '11:00',
          daysActive: ['monday', 'tuesday', 'wednesday', 'thursday'],
          noShowRule: 'NO_CHARGE' as const,
          changeReason: '',
        },
  })

  const limitPerDay = watch('limitPerDay')

  const onSubmit = async (data: PlanFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/empresa/configuracion/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al actualizar')
      }

      toast.success('Plan actualizado', {
        description: 'Los cambios se han guardado en el historial',
      })

      router.refresh()
    } catch (error: any) {
      toast.error('Error al guardar', {
        description: error.message || 'Inténtalo de nuevo',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!policy) {
    return (
      <Card className="p-12">
        <p className="text-center text-gray-500">
          No hay política configurada para esta empresa
        </p>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Límites Económicos */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Euro className="h-5 w-5 text-green-600" />
          Límites Económicos y Copagos
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="limitPerDay">
              Límite por Día (€) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="limitPerDay"
              type="number"
              step="0.01"
              {...register('limitPerDay')}
            />
            {errors.limitPerDay && (
              <p className="text-sm text-red-600">{errors.limitPerDay.message}</p>
            )}
            {limitPerDay && limitPerDay <= 11 && (
              <p className="text-xs text-green-600">
                ✓ Cumple con límite fiscal (≤ 11€/día)
              </p>
            )}
            {limitPerDay && limitPerDay > 11 && (
              <p className="text-xs text-red-600">
                ⚠ Excede límite de deducción fiscal
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="copayCompany">
              Paga Empresa (€) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="copayCompany"
              type="number"
              step="0.01"
              {...register('copayCompany')}
            />
            {errors.copayCompany && (
              <p className="text-sm text-red-600">{errors.copayCompany.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="copayEmployee">
              Paga Empleado (€) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="copayEmployee"
              type="number"
              step="0.01"
              {...register('copayEmployee')}
            />
            {errors.copayEmployee && (
              <p className="text-sm text-red-600">{errors.copayEmployee.message}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Horarios y Días */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Horarios y Días Activos
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cutoffTime">
              Hora de Cutoff <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cutoffTime"
              type="time"
              {...register('cutoffTime')}
            />
            {errors.cutoffTime && (
              <p className="text-sm text-red-600">{errors.cutoffTime.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Hora límite para hacer/modificar pedidos
            </p>
          </div>

          <div className="space-y-2">
            <Label>Días Activos <span className="text-red-500">*</span></Label>
            <Controller
              name="daysActive"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-4">
                  {daysOfWeek.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={day.value}
                        checked={field.value.includes(day.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([...field.value, day.value])
                          } else {
                            field.onChange(field.value.filter((v) => v !== day.value))
                          }
                        }}
                      />
                      <label
                        htmlFor={day.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {day.label}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            />
            {errors.daysActive && (
              <p className="text-sm text-red-600">{errors.daysActive.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="noShowRule">
              Regla de No Show <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="noShowRule"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NO_CHARGE">No Cobrar</SelectItem>
                    <SelectItem value="CHARGE">Cobrar</SelectItem>
                    <SelectItem value="PARTIAL">Cobro Parcial</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.noShowRule && (
              <p className="text-sm text-red-600">{errors.noShowRule.message}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Razón del Cambio */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Razón del Cambio</h3>
        <div className="space-y-2">
          <Label htmlFor="changeReason">
            Explica por qué cambias la política <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="changeReason"
            {...register('changeReason')}
            rows={3}
            placeholder="Ej: Ajuste fiscal para cumplir con normativa IRPF 2025"
          />
          {errors.changeReason && (
            <p className="text-sm text-red-600">{errors.changeReason.message}</p>
          )}
          <p className="text-xs text-gray-500">
            Esta razón quedará registrada en el historial de auditoría
          </p>
        </div>
      </Card>

      {/* Acciones */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Versión actual: {policy.version}
        </p>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>
      </div>
    </form>
  )
}
