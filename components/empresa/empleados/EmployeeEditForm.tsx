'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

type Employee = {
  id: string
  department: string | null
  dietPrefs: any
  status: string
  site: {
    id: string
    name: string
  }
}

export function EmployeeEditForm({ employee }: { employee: Employee }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    department: employee.department || '',
    siteId: employee.site.id,
    allergies: (employee.dietPrefs as any)?.allergies?.join(', ') || '',
    restrictions: (employee.dietPrefs as any)?.restrictions || [],
    status: employee.status,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/empresa/empleados/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: formData.department,
          siteId: formData.siteId,
          dietPrefs: {
            allergies: formData.allergies
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean),
            restrictions: formData.restrictions,
            preferences: [],
            calorieTarget: 2000,
          },
          status: formData.status,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar empleado')
      }

      toast.success('Empleado actualizado correctamente')
      router.push(`/empresa/empleados/${employee.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar el empleado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Departamento */}
      <div className="space-y-2">
        <Label htmlFor="department">Departamento</Label>
        <Input
          id="department"
          value={formData.department}
          onChange={(e) =>
            setFormData({ ...formData, department: e.target.value })
          }
          placeholder="Ej: Desarrollo, Marketing..."
        />
      </div>

      {/* Alergias */}
      <div className="space-y-2">
        <Label htmlFor="allergies">Alergias (separadas por comas)</Label>
        <Textarea
          id="allergies"
          value={formData.allergies}
          onChange={(e) =>
            setFormData({ ...formData, allergies: e.target.value })
          }
          placeholder="Ej: gluten, lactosa, frutos secos"
          rows={3}
        />
        <p className="text-xs text-gray-500">
          Separa múltiples alergias con comas
        </p>
      </div>

      {/* Restricciones */}
      <div className="space-y-3">
        <Label>Restricciones Dietéticas</Label>
        <div className="space-y-2">
          {['gluten_free', 'lactose_free', 'vegetarian', 'vegan'].map(
            (restriction) => (
              <div key={restriction} className="flex items-center space-x-2">
                <Checkbox
                  id={restriction}
                  checked={formData.restrictions.includes(restriction)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData({
                        ...formData,
                        restrictions: [...formData.restrictions, restriction],
                      })
                    } else {
                      setFormData({
                        ...formData,
                        restrictions: formData.restrictions.filter(
                          (r: string) => r !== restriction
                        ),
                      })
                    }
                  }}
                />
                <label
                  htmlFor={restriction}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {restriction === 'gluten_free' && 'Sin Gluten'}
                  {restriction === 'lactose_free' && 'Sin Lactosa'}
                  {restriction === 'vegetarian' && 'Vegetariano'}
                  {restriction === 'vegan' && 'Vegano'}
                </label>
              </div>
            )
          )}
        </div>
      </div>

      {/* Estado */}
      <div className="space-y-2">
        <Label htmlFor="status">Estado</Label>
        <Select
          value={formData.status}
          onValueChange={(value) =>
            setFormData({ ...formData, status: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Activo</SelectItem>
            <SelectItem value="SUSPENDED">Suspendido</SelectItem>
            <SelectItem value="INACTIVE">Inactivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Botones */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}

