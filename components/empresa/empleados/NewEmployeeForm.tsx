'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const employeeSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'El nombre es requerido'),
  employeeNumber: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  siteId: z.string().min(1, 'La sede es requerida'),
  startDate: z.string().optional(),
  weeklyMenuDays: z.coerce.number().min(1).max(7).optional(),
  monthlyLimit: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
  sendInvitation: z.boolean().default(true),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

type NewEmployeeFormProps = {
  sites: Array<{
    id: string
    name: string
    address: string | null
    city: string | null
  }>
}

export function NewEmployeeForm({ sites }: NewEmployeeFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      weeklyMenuDays: 4,
      sendInvitation: true,
    },
  })

  const sendInvitation = watch('sendInvitation')

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/empresa/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al crear empleado')
      }

      const result = await response.json()

      toast.success('Empleado creado exitosamente', {
        description: sendInvitation
          ? 'Se ha enviado un email de invitación'
          : 'El empleado ha sido registrado',
      })

      router.push(`/empresa/empleados/${result.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error('Error al crear empleado', {
        description: error.message || 'Inténtalo de nuevo',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Información Personal</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Nombre */}
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

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="juan.perez@empresa.com"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Número de Empleado */}
          <div className="space-y-2">
            <Label htmlFor="employeeNumber">Número de Empleado</Label>
            <Input
              id="employeeNumber"
              {...register('employeeNumber')}
              placeholder="EMP-001"
            />
          </div>

          {/* Departamento */}
          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Input
              id="department"
              {...register('department')}
              placeholder="Tecnología"
            />
          </div>

          {/* Cargo */}
          <div className="space-y-2">
            <Label htmlFor="position">Cargo</Label>
            <Input
              id="position"
              {...register('position')}
              placeholder="Desarrollador Senior"
            />
          </div>

          {/* Fecha de Alta */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha de Alta</Label>
            <Input
              id="startDate"
              type="date"
              {...register('startDate')}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Ubicación y Beneficio</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Sede */}
          <div className="space-y-2">
            <Label htmlFor="siteId">
              Sede <span className="text-red-500">*</span>
            </Label>
            <Select
              onValueChange={(value) => setValue('siteId', value)}
              defaultValue=""
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una sede" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                    {site.city && ` - ${site.city}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.siteId && (
              <p className="text-sm text-red-600">{errors.siteId.message}</p>
            )}
          </div>

          {/* Días de menú por semana */}
          <div className="space-y-2">
            <Label htmlFor="weeklyMenuDays">Días de Menú por Semana</Label>
            <Input
              id="weeklyMenuDays"
              type="number"
              min="1"
              max="7"
              {...register('weeklyMenuDays')}
              placeholder="4"
            />
            <p className="text-xs text-gray-500">
              Número de días que el empleado puede pedir menú
            </p>
          </div>

          {/* Límite mensual */}
          <div className="space-y-2">
            <Label htmlFor="monthlyLimit">Límite Mensual (€)</Label>
            <Input
              id="monthlyLimit"
              type="number"
              step="0.01"
              min="0"
              {...register('monthlyLimit')}
              placeholder="220.00"
            />
            <p className="text-xs text-gray-500">
              Límite personalizado (opcional)
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notas y Observaciones</h3>
        <div className="space-y-2">
          <Label htmlFor="notes">Notas Internas</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="Información adicional, preferencias dietéticas, alergias..."
            rows={4}
          />
          <p className="text-xs text-gray-500">
            Esta información solo es visible para administradores
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-start gap-3">
          <Checkbox
            id="sendInvitation"
            checked={sendInvitation}
            onCheckedChange={(checked) =>
              setValue('sendInvitation', checked as boolean)
            }
          />
          <div className="space-y-1">
            <Label htmlFor="sendInvitation" className="cursor-pointer">
              Enviar invitación por email
            </Label>
            <p className="text-sm text-gray-500">
              El empleado recibirá un email con instrucciones para acceder al
              portal
            </p>
          </div>
        </div>
      </Card>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          asChild
        >
          <Link href="/empresa/empleados">
            Cancelar
          </Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Creando...' : 'Crear Empleado'}
        </Button>
      </div>
    </form>
  )
}

