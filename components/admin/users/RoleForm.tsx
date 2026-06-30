'use client'

/**
 * Formulario de creación/edición de un rol + sus permisos.
 * Roles del sistema: nombre/categoría bloqueados, permisos editables, sin borrar.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TenantType, UserRole } from '@prisma/client'
import { rolesByTenantType } from '@/lib/auth/permissions'
import { PermissionPicker, type CatalogPortal } from './PermissionPicker'
import { createRole, updateRole, deleteRole } from './role-actions'

type Category = 'ROOT' | 'EMPRESA' | 'CATERING'

type Initial = {
  name: string
  description: string
  category: Category
  baseRole: string
  isSystem: boolean
  permissionKeys: string[]
}

type Props = {
  mode: 'create' | 'edit'
  roleId?: string
  catalog: CatalogPortal[]
  initial: Initial
}

export function RoleForm({ mode, roleId, catalog, initial }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [category, setCategory] = useState<Category>(initial.category)
  const [baseRole, setBaseRole] = useState(initial.baseRole)
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.permissionKeys))

  const isSystem = initial.isSystem
  const baseRoleOptions = rolesByTenantType(category as TenantType)

  const changeCategory = (c: Category) => {
    setCategory(c)
    const opts = rolesByTenantType(c as TenantType)
    if (!opts.includes(baseRole as UserRole)) setBaseRole(opts[0] ?? '')
  }

  const toggle = (key: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })

  const toggleMany = (keys: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const k of keys) {
        if (on) next.add(k)
        else next.delete(k)
      }
      return next
    })

  const save = () => {
    setError(null)
    const payload = {
      name,
      description,
      category,
      baseRole,
      permissionKeys: [...selected],
    }
    startTransition(async () => {
      const res =
        mode === 'create'
          ? await createRole(payload)
          : await updateRole(roleId!, payload)
      if (res.error) {
        setError(res.error)
        return
      }
      router.push('/admin/users/roles')
      router.refresh()
    })
  }

  const remove = () => {
    if (!roleId) return
    if (!confirm('¿Eliminar este rol? Solo es posible si no tiene usuarios asignados.')) return
    setError(null)
    startTransition(async () => {
      const res = await deleteRole(roleId)
      if (res.error) {
        setError(res.error)
        return
      }
      router.push('/admin/users/roles')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name">Nombre del rol</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSystem}
            />
            {isSystem && (
              <p className="mt-1 text-xs text-gray-400">
                Rol del sistema: el nombre y la categoría no se editan, solo sus permisos.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="category">Portal / categoría</Label>
            <Select
              value={category}
              onValueChange={(v) => changeCategory(v as Category)}
              disabled={isSystem}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ROOT">Admin (equipo Plati)</SelectItem>
                <SelectItem value="EMPRESA">Empresa</SelectItem>
                <SelectItem value="CATERING">Catering</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="baseRole">Rol base (compatibilidad)</Label>
            <Select value={baseRole} onValueChange={setBaseRole} disabled={isSystem}>
              <SelectTrigger id="baseRole">
                <SelectValue placeholder="Elige un rol base" />
              </SelectTrigger>
              <SelectContent>
                {baseRoleOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-gray-400">
              Determina el enrutado del portal y la compatibilidad con los controles por rol.
            </p>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Para qué sirve este rol"
            />
          </div>
        </div>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Permisos</h3>
          <span className="text-xs text-gray-500">{selected.size} seleccionados</span>
        </div>
        <PermissionPicker
          catalog={catalog}
          selected={selected}
          onToggle={toggle}
          onToggleMany={toggleMany}
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div>
          {mode === 'edit' && !isSystem && (
            <Button variant="outline" className="text-red-600" onClick={remove} disabled={isPending}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar rol
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/users/roles')} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? 'Guardando…' : mode === 'create' ? 'Crear rol' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  )
}
