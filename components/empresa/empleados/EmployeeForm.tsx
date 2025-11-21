'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type EmployeeFormProps = {
  mode: 'create' | 'edit'
  initialData?: any
}

export function EmployeeForm({ mode, initialData }: EmployeeFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const data = {
        email: formData.get('email'),
        name: formData.get('name'),
        phone: formData.get('phone'),
        employeeNumber: formData.get('employeeNumber') || null,
        department: formData.get('department') || null,
        position: formData.get('position') || null,
        startDate: formData.get('startDate') || null,
      }

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
        throw new Error(error.message || 'Error al guardar')
      }

      toast.success(mode === 'create' ? 'Empleado creado' : 'Empleado actualizado')
      router.push('/empresa/empleados')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Email */}
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={initialData?.email}
            placeholder="email@empresa.com"
          />
        </div>

        {/* Nombre */}
        <div>
          <Label htmlFor="name">Nombre Completo *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initialData?.name}
            placeholder="Juan Pérez"
          />
        </div>

        {/* Teléfono */}
        <div>
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={initialData?.phone}
            placeholder="+34 600 000 000"
          />
        </div>

        {/* Número de Empleado */}
        <div>
          <Label htmlFor="employeeNumber">Número de Empleado</Label>
          <Input
            id="employeeNumber"
            name="employeeNumber"
            defaultValue={initialData?.employeeNumber}
            placeholder="EMP001"
          />
        </div>

        {/* Departamento */}
        <div>
          <Label htmlFor="department">Departamento</Label>
          <Input
            id="department"
            name="department"
            defaultValue={initialData?.department}
            placeholder="Desarrollo"
          />
        </div>

        {/* Puesto */}
        <div>
          <Label htmlFor="position">Puesto</Label>
          <Input
            id="position"
            name="position"
            defaultValue={initialData?.position}
            placeholder="Desarrollador Senior"
          />
        </div>

        {/* Fecha de Alta */}
        <div>
          <Label htmlFor="startDate">Fecha de Alta</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={
              initialData?.startDate
                ? new Date(initialData.startDate).toISOString().split('T')[0]
                : ''
            }
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : mode === 'create' ? 'Crear Empleado' : 'Guardar Cambios'}
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

