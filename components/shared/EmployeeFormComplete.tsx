'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, User, Briefcase, Calendar, MapPin, Utensils } from 'lucide-react'

// Schema de validación completo
const employeeSchema = z.object({
  // === DATOS USUARIO ===
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().optional().nullable(),
  
  // === DATOS LABORALES ===
  employeeNumber: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  siteId: z.string().min(1, 'Sede requerida'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  
  // === CONFIGURACIÓN MENÚ ===
  weeklyMenuDays: z.coerce.number().int().min(0).max(7).optional().nullable(),
  monthlyLimit: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  
  // === PREFERENCIAS DIETÉTICAS ===
  dietPrefs: z.object({
    allergies: z.array(z.string()).optional(),
    restrictions: z.array(z.string()).optional(),
    preferences: z.array(z.string()).optional(),
  }).optional(),
  
  // === OPCIONES ===
  sendInvitation: z.boolean().default(true),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

type Site = {
  id: string
  name: string
  address: string | null
  city: string | null
}

type EmployeeFormCompleteProps = {
  mode: 'create' | 'edit'
  sites: Site[]
  initialData?: Partial<EmployeeFormData> & { id?: string }
  redirectPath?: string
}

export function EmployeeFormComplete({
  mode,
  sites,
  initialData,
  redirectPath = '/empresa/empleados',
}: EmployeeFormCompleteProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      email: initialData?.email || '',
      name: initialData?.name || '',
      phone: initialData?.phone || '',
      employeeNumber: initialData?.employeeNumber || '',
      department: initialData?.department || '',
      position: initialData?.position || '',
      siteId: initialData?.siteId || '',
      startDate: initialData?.startDate || '',
      endDate: initialData?.endDate || '',
      weeklyMenuDays: initialData?.weeklyMenuDays || 4,
      monthlyLimit: initialData?.monthlyLimit || undefined,
      notes: initialData?.notes || '',
      dietPrefs: initialData?.dietPrefs || { allergies: [], restrictions: [], preferences: [] },
      sendInvitation: initialData?.sendInvitation ?? true,
    },
  })

  const selectedSite = watch('siteId')

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true)

    try {
      const url = mode === 'create' 
        ? '/api/empresa/empleados'
        : `/api/empresa/empleados/${initialData?.id}`

      const method = mode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || error.message || 'Error al guardar')
      }

      toast.success(
        mode === 'create' ? 'Empleado creado' : 'Empleado actualizado',
        {
          description: mode === 'create' 
            ? 'Se ha enviado un email de invitación' 
            : 'Los cambios se han guardado correctamente',
        }
      )

      router.push(redirectPath)
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
      {/* === DATOS PERSONALES === */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Datos Personales</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nombre Completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Juan Pérez García"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="juan.perez@empresa.com"
              disabled={mode === 'edit'}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
            {mode === 'edit' && (
              <p className="text-xs text-gray-500">El email no se puede modificar</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              placeholder="+34 600 000 000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeNumber">Número de Empleado</Label>
            <Input
              id="employeeNumber"
              {...register('employeeNumber')}
              placeholder="EMP001"
            />
          </div>
        </div>
      </Card>

      {/* === DATOS LABORALES === */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold">Datos Laborales</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="siteId">
              Sede <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedSite}
              onValueChange={(value) => setValue('siteId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una sede" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{site.name}</span>
                      {site.city && (
                        <span className="text-xs text-gray-500">{site.city}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.siteId && (
              <p className="text-sm text-red-600">{errors.siteId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Input
              id="department"
              {...register('department')}
              placeholder="Desarrollo, Marketing, Ventas..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Puesto</Label>
            <Input
              id="position"
              {...register('position')}
              placeholder="Desarrollador Senior, Gerente..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha de Alta</Label>
            <Input
              id="startDate"
              type="date"
              {...register('startDate')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Fecha de Baja (opcional)</Label>
            <Input
              id="endDate"
              type="date"
              {...register('endDate')}
            />
          </div>
        </div>
      </Card>

      {/* === CONFIGURACIÓN DE MENÚ === */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Utensils className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold">Configuración de Menú</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weeklyMenuDays">
              Días de Menú por Semana
            </Label>
            <Input
              id="weeklyMenuDays"
              type="number"
              min="0"
              max="7"
              {...register('weeklyMenuDays')}
              placeholder="4"
            />
            {errors.weeklyMenuDays && (
              <p className="text-sm text-red-600">{errors.weeklyMenuDays.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Número de días que el empleado puede pedir menú
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyLimit">Límite Mensual (€)</Label>
            <Input
              id="monthlyLimit"
              type="number"
              step="0.01"
              {...register('monthlyLimit')}
              placeholder="220.00"
            />
            <p className="text-xs text-gray-500">
              Límite personalizado (opcional)
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notas / Observaciones</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              rows={3}
              placeholder="Observaciones generales, horarios especiales, etc..."
            />
          </div>
        </div>
      </Card>

      {/* === PREFERENCIAS DIETÉTICAS === */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold">Preferencias Dietéticas</h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="allergies">Alergias (separadas por comas)</Label>
            <Input
              id="allergies"
              {...register('dietPrefs.allergies', {
                setValueAs: (val) => {
                  if (!val || typeof val !== 'string') return []
                  return val.split(',').map((s: string) => s.trim()).filter(Boolean)
                },
              })}
              defaultValue={initialData?.dietPrefs?.allergies?.join(', ') || ''}
              placeholder="Ej: Gluten, Lactosa, Frutos secos"
            />
            <p className="text-xs text-gray-500">
              Lista de alergias alimentarias del empleado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="restrictions">Restricciones Dietéticas (separadas por comas)</Label>
            <Input
              id="restrictions"
              {...register('dietPrefs.restrictions', {
                setValueAs: (val) => {
                  if (!val || typeof val !== 'string') return []
                  return val.split(',').map((s: string) => s.trim()).filter(Boolean)
                },
              })}
              defaultValue={initialData?.dietPrefs?.restrictions?.join(', ') || ''}
              placeholder="Ej: Vegetariano, Vegano, Halal, Sin carne roja"
            />
            <p className="text-xs text-gray-500">
              Restricciones alimentarias por salud, religión o preferencia
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferences">Preferencias (separadas por comas)</Label>
            <Input
              id="preferences"
              {...register('dietPrefs.preferences', {
                setValueAs: (val) => {
                  if (!val || typeof val !== 'string') return []
                  return val.split(',').map((s: string) => s.trim()).filter(Boolean)
                },
              })}
              defaultValue={initialData?.dietPrefs?.preferences?.join(', ') || ''}
              placeholder="Ej: Pescado, Verduras, Picante, Ensaladas"
            />
            <p className="text-xs text-gray-500">
              Preferencias personales de comida
            </p>
          </div>
        </div>
      </Card>

      {/* === ACCIONES === */}
      <div className="flex items-center justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          asChild
        >
          <Link href={redirectPath}>
            Cancelar
          </Link>
        </Button>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Crear Empleado' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  )
}

