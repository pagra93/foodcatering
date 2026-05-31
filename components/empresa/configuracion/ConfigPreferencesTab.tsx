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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Bell, Globe, Shield, FileText } from 'lucide-react'

const preferencesSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  notifyOnOrderConfirmed: z.boolean(),
  notifyOnOrderDelivered: z.boolean(),
  notifyOnIncident: z.boolean(),
  notifyOnInvoice: z.boolean(),
  weeklyDigest: z.boolean(),
  monthlyReport: z.boolean(),
  preferredLanguage: z.string(),
  timezone: z.string(),
  currency: z.string(),
  dateFormat: z.string(),
  fiscalDocRetention: z.coerce.number().min(4).max(10),
  autoApproveOrders: z.boolean(),
  requirePhotoProof: z.boolean(),
  allowEmployeeFeedback: z.boolean(),
})

type PreferencesFormData = z.infer<typeof preferencesSchema>

import type { Prisma } from '@prisma/client'

type ConfigPreferencesTabProps = {
  settings: {
    id?: string
    deliveryLocation?: string | null
    deliveryInstructions?: string | null
    notificationsEmail?: string[]
    notifyDailySummary?: boolean
    notifyIncidents?: boolean
    notifyInvoices?: boolean
    notifyLowAdoption?: boolean
    defaultViewEmployees?: string
    defaultPeriodReports?: string
    alertCancellationRate?: Prisma.Decimal | number
    alertAdoptionRate?: Prisma.Decimal | number
    alertDeductibilityRate?: Prisma.Decimal | number
    // Campos legacy / opcionales que el form local espera pero no existen en DB
    emailNotifications?: boolean
    smsNotifications?: boolean
    notifyOnOrderConfirmed?: boolean
    notifyOnOrderDelivered?: boolean
    notifyOnIncident?: boolean
    notifyOnInvoice?: boolean
    weeklyDigest?: boolean
    monthlyReport?: boolean
    preferredLanguage?: string
    timezone?: string
    currency?: string
    dateFormat?: string
    fiscalDocRetention?: number
    autoApproveOrders?: boolean
    requirePhotoProof?: boolean
    allowEmployeeFeedback?: boolean
  } | null
}

export function ConfigPreferencesTab({ settings }: ConfigPreferencesTabProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultValues: PreferencesFormData = {
    emailNotifications: settings?.emailNotifications ?? true,
    smsNotifications: settings?.smsNotifications ?? false,
    notifyOnOrderConfirmed: settings?.notifyOnOrderConfirmed ?? true,
    notifyOnOrderDelivered: settings?.notifyOnOrderDelivered ?? true,
    notifyOnIncident: settings?.notifyOnIncident ?? true,
    notifyOnInvoice: settings?.notifyOnInvoice ?? true,
    weeklyDigest: settings?.weeklyDigest ?? true,
    monthlyReport: settings?.monthlyReport ?? true,
    preferredLanguage: settings?.preferredLanguage ?? 'es',
    timezone: settings?.timezone ?? 'Europe/Madrid',
    currency: settings?.currency ?? 'EUR',
    dateFormat: settings?.dateFormat ?? 'dd/MM/yyyy',
    fiscalDocRetention: settings?.fiscalDocRetention ?? 4,
    autoApproveOrders: settings?.autoApproveOrders ?? false,
    requirePhotoProof: settings?.requirePhotoProof ?? true,
    allowEmployeeFeedback: settings?.allowEmployeeFeedback ?? true,
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues,
  })

  const emailNotifications = watch('emailNotifications')
  const smsNotifications = watch('smsNotifications')
  const notifyOnOrderConfirmed = watch('notifyOnOrderConfirmed')
  const notifyOnOrderDelivered = watch('notifyOnOrderDelivered')
  const notifyOnIncident = watch('notifyOnIncident')
  const notifyOnInvoice = watch('notifyOnInvoice')
  const weeklyDigest = watch('weeklyDigest')
  const monthlyReport = watch('monthlyReport')
  const autoApproveOrders = watch('autoApproveOrders')
  const requirePhotoProof = watch('requirePhotoProof')
  const allowEmployeeFeedback = watch('allowEmployeeFeedback')

  const onSubmit = async (data: PreferencesFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/empresa/configuracion/preferencias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al actualizar')
      }

      toast.success('Preferencias actualizadas', {
        description: 'Los cambios se han guardado correctamente',
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Notificaciones */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notificaciones
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificaciones por Email</Label>
              <p className="text-sm text-gray-500">
                Recibir notificaciones en tu correo electrónico
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={(checked) =>
                setValue('emailNotifications', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificaciones por SMS</Label>
              <p className="text-sm text-gray-500">
                Recibir alertas importantes por mensaje de texto
              </p>
            </div>
            <Switch
              checked={smsNotifications}
              onCheckedChange={(checked) => setValue('smsNotifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Pedido Confirmado</Label>
              <p className="text-sm text-gray-500">
                Notificar cuando un empleado confirma un pedido
              </p>
            </div>
            <Switch
              checked={notifyOnOrderConfirmed}
              onCheckedChange={(checked) =>
                setValue('notifyOnOrderConfirmed', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Pedido Entregado</Label>
              <p className="text-sm text-gray-500">
                Notificar cuando se entrega un pedido
              </p>
            </div>
            <Switch
              checked={notifyOnOrderDelivered}
              onCheckedChange={(checked) =>
                setValue('notifyOnOrderDelivered', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Incidencias</Label>
              <p className="text-sm text-gray-500">
                Notificar cuando se reporta una incidencia
              </p>
            </div>
            <Switch
              checked={notifyOnIncident}
              onCheckedChange={(checked) => setValue('notifyOnIncident', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Facturas</Label>
              <p className="text-sm text-gray-500">
                Notificar cuando se genera una nueva factura
              </p>
            </div>
            <Switch
              checked={notifyOnInvoice}
              onCheckedChange={(checked) => setValue('notifyOnInvoice', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Resumen Semanal</Label>
              <p className="text-sm text-gray-500">
                Recibir un resumen semanal de actividad
              </p>
            </div>
            <Switch
              checked={weeklyDigest}
              onCheckedChange={(checked) => setValue('weeklyDigest', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Informe Mensual</Label>
              <p className="text-sm text-gray-500">
                Recibir un informe mensual completo
              </p>
            </div>
            <Switch
              checked={monthlyReport}
              onCheckedChange={(checked) => setValue('monthlyReport', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Regional */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-green-600" />
          Configuración Regional
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="preferredLanguage">Idioma</Label>
            <Select
              value={watch('preferredLanguage')}
              onValueChange={(value) => setValue('preferredLanguage', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ca">Català</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Zona Horaria</Label>
            <Select
              value={watch('timezone')}
              onValueChange={(value) => setValue('timezone', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Madrid">Madrid (CET)</SelectItem>
                <SelectItem value="Atlantic/Canary">Canarias (WET)</SelectItem>
                <SelectItem value="Europe/London">Londres (GMT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Moneda</Label>
            <Select
              value={watch('currency')}
              onValueChange={(value) => setValue('currency', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">Euro (€)</SelectItem>
                <SelectItem value="GBP">Libra (£)</SelectItem>
                <SelectItem value="USD">Dólar ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFormat">Formato de Fecha</Label>
            <Select
              value={watch('dateFormat')}
              onValueChange={(value) => setValue('dateFormat', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                <SelectItem value="MM/dd/yyyy">MM/DD/AAAA</SelectItem>
                <SelectItem value="yyyy-MM-dd">AAAA-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Operaciones */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Operaciones
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Aprobar Pedidos Automáticamente</Label>
              <p className="text-sm text-gray-500">
                Los pedidos se confirman sin revisión manual
              </p>
            </div>
            <Switch
              checked={autoApproveOrders}
              onCheckedChange={(checked) => setValue('autoApproveOrders', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Requerir Foto de Entrega</Label>
              <p className="text-sm text-gray-500">
                El repartidor debe tomar foto al entregar
              </p>
            </div>
            <Switch
              checked={requirePhotoProof}
              onCheckedChange={(checked) => setValue('requirePhotoProof', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Permitir Valoraciones de Empleados</Label>
              <p className="text-sm text-gray-500">
                Los empleados pueden valorar los menús
              </p>
            </div>
            <Switch
              checked={allowEmployeeFeedback}
              onCheckedChange={(checked) =>
                setValue('allowEmployeeFeedback', checked)
              }
            />
          </div>
        </div>
      </Card>

      {/* Fiscal */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-600" />
          Configuración Fiscal
        </h3>
        <div className="space-y-2">
          <Label htmlFor="fiscalDocRetention">
            Años de Retención de Documentos Fiscales
          </Label>
          <Input
            id="fiscalDocRetention"
            type="number"
            min="4"
            max="10"
            {...register('fiscalDocRetention')}
          />
          {errors.fiscalDocRetention && (
            <p className="text-sm text-red-600">
              {errors.fiscalDocRetention.message}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Mínimo legal: 4 años. Recomendado: 6 años
          </p>
        </div>
      </Card>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3">
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
    </form>
  )
}

