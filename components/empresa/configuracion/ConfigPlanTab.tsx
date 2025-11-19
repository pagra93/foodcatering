'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Euro, Calendar, Clock, AlertTriangle } from 'lucide-react'

const planSchema = z.object({
  dailyLimit: z.coerce.number().positive('Debe ser mayor a 0').max(11, 'Máximo 11€ para deducción fiscal'),
  monthlyLimit: z.coerce.number().positive().optional(),
  subsidyPercentage: z.coerce.number().min(0).max(100),
  allowWeekends: z.boolean(),
  allowHolidays: z.boolean(),
  cutoffTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato HH:MM'),
  cancellationDeadlineHours: z.coerce.number().min(1).max(48),
  penaltyForNoShow: z.coerce.number().min(0).optional(),
  penaltyForLateCancellation: z.coerce.number().min(0).optional(),
  allowDietaryPreferences: z.boolean(),
  requiresManagerApproval: z.boolean(),
  maxAdvanceOrderDays: z.coerce.number().min(1).max(30),
  minAdvanceOrderDays: z.coerce.number().min(0).max(7),
  changeReason: z.string().min(10, 'Explica la razón del cambio (mín. 10 caracteres)'),
})

type PlanFormData = z.infer<typeof planSchema>

type ConfigPlanTabProps = {
  policy: {
    dailyLimit: number
    monthlyLimit: number | null
    subsidyPercentage: number
    allowWeekends: boolean
    allowHolidays: boolean
    cutoffTime: string
    cancellationDeadlineHours: number
    penaltyForNoShow: number | null
    penaltyForLateCancellation: number | null
    allowDietaryPreferences: boolean
    requiresManagerApproval: boolean
    maxAdvanceOrderDays: number
    minAdvanceOrderDays: number
    version: number
  } | null
}

export function ConfigPlanTab({ policy }: ConfigPlanTabProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: policy
      ? {
          dailyLimit: Number(policy.dailyLimit),
          monthlyLimit: policy.monthlyLimit ? Number(policy.monthlyLimit) : undefined,
          subsidyPercentage: Number(policy.subsidyPercentage),
          allowWeekends: policy.allowWeekends,
          allowHolidays: policy.allowHolidays,
          cutoffTime: policy.cutoffTime,
          cancellationDeadlineHours: policy.cancellationDeadlineHours,
          penaltyForNoShow: policy.penaltyForNoShow ? Number(policy.penaltyForNoShow) : undefined,
          penaltyForLateCancellation: policy.penaltyForLateCancellation
            ? Number(policy.penaltyForLateCancellation)
            : undefined,
          allowDietaryPreferences: policy.allowDietaryPreferences,
          requiresManagerApproval: policy.requiresManagerApproval,
          maxAdvanceOrderDays: policy.maxAdvanceOrderDays,
          minAdvanceOrderDays: policy.minAdvanceOrderDays,
          changeReason: '',
        }
      : undefined,
  })

  const dailyLimit = watch('dailyLimit')
  const allowWeekends = watch('allowWeekends')
  const allowHolidays = watch('allowHolidays')
  const allowDietaryPreferences = watch('allowDietaryPreferences')
  const requiresManagerApproval = watch('requiresManagerApproval')

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
      {/* Límites */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Euro className="h-5 w-5 text-green-600" />
          Límites Económicos
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dailyLimit">
              Límite Diario (€) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dailyLimit"
              type="number"
              step="0.01"
              {...register('dailyLimit')}
            />
            {errors.dailyLimit && (
              <p className="text-sm text-red-600">{errors.dailyLimit.message}</p>
            )}
            {dailyLimit && dailyLimit <= 11 && (
              <p className="text-xs text-green-600">
                ✓ Cumple con límite fiscal (≤ 11€/día)
              </p>
            )}
            {dailyLimit && dailyLimit > 11 && (
              <p className="text-xs text-red-600">
                ⚠ Excede límite de deducción fiscal
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyLimit">Límite Mensual (€)</Label>
            <Input
              id="monthlyLimit"
              type="number"
              step="0.01"
              {...register('monthlyLimit')}
              placeholder="Opcional"
            />
            <p className="text-xs text-gray-500">
              Si se deja vacío, no habrá límite mensual
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subsidyPercentage">
              % Pagado por Empresa <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subsidyPercentage"
              type="number"
              min="0"
              max="100"
              {...register('subsidyPercentage')}
            />
            {errors.subsidyPercentage && (
              <p className="text-sm text-red-600">
                {errors.subsidyPercentage.message}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Horarios y Cutoff */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Horarios y Plazos
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              Hora límite para hacer/modificar pedidos del día siguiente
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellationDeadlineHours">
              Plazo de Cancelación (horas) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cancellationDeadlineHours"
              type="number"
              min="1"
              max="48"
              {...register('cancellationDeadlineHours')}
            />
            {errors.cancellationDeadlineHours && (
              <p className="text-sm text-red-600">
                {errors.cancellationDeadlineHours.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="minAdvanceOrderDays">
              Días Mínimos de Antelación
            </Label>
            <Input
              id="minAdvanceOrderDays"
              type="number"
              min="0"
              max="7"
              {...register('minAdvanceOrderDays')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAdvanceOrderDays">
              Días Máximos de Antelación
            </Label>
            <Input
              id="maxAdvanceOrderDays"
              type="number"
              min="1"
              max="30"
              {...register('maxAdvanceOrderDays')}
            />
          </div>
        </div>
      </Card>

      {/* Penalizaciones */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Penalizaciones
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="penaltyForNoShow">Penalización por No Recoger (€)</Label>
            <Input
              id="penaltyForNoShow"
              type="number"
              step="0.01"
              min="0"
              {...register('penaltyForNoShow')}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500">
              Cargo al empleado si no recoge el menú
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="penaltyForLateCancellation">
              Penalización por Cancelación Tardía (€)
            </Label>
            <Input
              id="penaltyForLateCancellation"
              type="number"
              step="0.01"
              min="0"
              {...register('penaltyForLateCancellation')}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500">
              Cargo por cancelar después del plazo
            </p>
          </div>
        </div>
      </Card>

      {/* Opciones */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          Opciones del Plan
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Permitir Fines de Semana</Label>
              <p className="text-sm text-gray-500">
                Los empleados pueden pedir menús los sábados y domingos
              </p>
            </div>
            <Switch
              checked={allowWeekends}
              onCheckedChange={(checked) => setValue('allowWeekends', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Permitir Festivos</Label>
              <p className="text-sm text-gray-500">
                Los empleados pueden pedir menús en días festivos
              </p>
            </div>
            <Switch
              checked={allowHolidays}
              onCheckedChange={(checked) => setValue('allowHolidays', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Permitir Preferencias Dietéticas</Label>
              <p className="text-sm text-gray-500">
                Los empleados pueden indicar alergias y preferencias
              </p>
            </div>
            <Switch
              checked={allowDietaryPreferences}
              onCheckedChange={(checked) =>
                setValue('allowDietaryPreferences', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Requiere Aprobación de Manager</Label>
              <p className="text-sm text-gray-500">
                Los pedidos deben ser aprobados por un responsable
              </p>
            </div>
            <Switch
              checked={requiresManagerApproval}
              onCheckedChange={(checked) =>
                setValue('requiresManagerApproval', checked)
              }
            />
          </div>
        </div>
      </Card>

      {/* Razón del cambio */}
      {isDirty && (
        <Card className="p-6 border-blue-200 bg-blue-50">
          <h3 className="text-lg font-semibold mb-4">Razón del Cambio</h3>
          <div className="space-y-2">
            <Label htmlFor="changeReason">
              Explica por qué estás modificando la política{' '}
              <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="changeReason"
              {...register('changeReason')}
              placeholder="Ej: Ajuste del límite diario para cumplir con nueva política fiscal..."
              rows={3}
            />
            {errors.changeReason && (
              <p className="text-sm text-red-600">{errors.changeReason.message}</p>
            )}
            <p className="text-xs text-gray-600">
              Se guardará en el historial para auditoría
            </p>
          </div>
        </Card>
      )}

      {/* Botones */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Versión actual: {policy.version}</p>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.refresh()}
            disabled={isSubmitting}
          >
            Restablecer
          </Button>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </form>
  )
}

