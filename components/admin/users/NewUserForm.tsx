'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { TenantType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import { createUserAction } from './actions'

type TenantOption = {
  id: string
  name: string
  subdomain: string
  type: TenantType
}

/** Rol del RBAC; `category` casa con TenantType (ROOT/EMPRESA/CATERING). */
type RoleOption = {
  id: string
  name: string
  isSystem: boolean
  category: string
  description: string | null
}

export function NewUserForm({
  tenants,
  roles,
}: {
  tenants: TenantOption[]
  roles: RoleOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [tenantId, setTenantId] = useState<string>(
    tenants.find((t) => t.type === 'ROOT')?.id ?? tenants[0]?.id ?? ''
  )
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [roleId, setRoleId] = useState<string>('')
  const [password, setPassword] = useState('')

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === tenantId),
    [tenantId, tenants]
  )

  const availableRoles = useMemo<RoleOption[]>(() => {
    if (!selectedTenant) return []
    return roles.filter((r) => r.category === selectedTenant.type)
  }, [selectedTenant, roles])

  const selectedRole = useMemo(
    () => availableRoles.find((r) => r.id === roleId),
    [availableRoles, roleId]
  )

  // Resetear rol cuando cambia el tenant si el rol actual no aplica.
  useEffect(() => {
    if (roleId && !availableRoles.some((r) => r.id === roleId)) {
      setRoleId('')
    }
  }, [availableRoles, roleId])

  const isCrossTenantWarning =
    selectedTenant && selectedTenant.type !== 'ROOT'

  const generatePassword = () => {
    const chars =
      'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
    let out = ''
    for (let i = 0; i < 14; i++) {
      out += chars[Math.floor(Math.random() * chars.length)]
    }
    // Asegurar al menos una mayúscula y un número.
    if (!/[A-Z]/.test(out)) out = 'A' + out.slice(1)
    if (!/[0-9]/.test(out)) out = out.slice(0, -1) + '7'
    setPassword(out)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!roleId) {
      setError('Selecciona un rol')
      return
    }
    startTransition(async () => {
      const res = await createUserAction({
        tenantId,
        email,
        name,
        phone: phone || undefined,
        roleId,
        password,
      })
      if (!res.success) {
        setError(res.error)
        toast.error(res.error)
        return
      }
      toast.success(`Usuario creado: ${res.data.email}`)
      router.push(`/admin/users/${res.data.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit}>
      <Card className="max-w-2xl space-y-5 p-6">
        {/* Tenant */}
        <div>
          <Label htmlFor="tenantId">Tenant</Label>
          <select
            id="tenantId"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            required
          >
            <optgroup label="Equipo Plati (ROOT)">
              {tenants
                .filter((t) => t.type === 'ROOT')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Empresas">
              {tenants
                .filter((t) => t.type === 'EMPRESA')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subdomain})
                  </option>
                ))}
            </optgroup>
            <optgroup label="Caterings">
              {tenants
                .filter((t) => t.type === 'CATERING')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subdomain})
                  </option>
                ))}
            </optgroup>
          </select>
          {isCrossTenantWarning && (
            <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Crear directamente en un tenant que no es ROOT</strong>
                <p className="mt-1 text-xs">
                  Normalmente los usuarios de empresa/catering se crean desde
                  sus portales. Solo hazlo aquí si es un caso de soporte puntual
                  (onboarding inicial, cliente bloqueado). Preferible usar
                  impersonación si puedes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Email + Nombre */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nombre@empresa.com"
            />
          </div>
          <div>
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Laura García"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone">Teléfono (opcional)</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+34 600 000 000"
          />
        </div>

        {/* Role */}
        <div>
          <Label htmlFor="role">Rol</Label>
          <select
            id="role"
            aria-label="Rol del usuario"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            required
          >
            <option value="">— Selecciona un rol —</option>
            {availableRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.isSystem ? ' (sistema)' : ''}
              </option>
            ))}
          </select>
          {selectedRole?.description && (
            <p className="mt-1 text-xs text-gray-500">
              {selectedRole.description}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <Label htmlFor="password">Contraseña temporal</Label>
          <div className="mt-1 flex gap-2">
            <Input
              id="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Mínimo 8 caracteres, una mayúscula y un número"
            />
            <Button type="button" variant="outline" onClick={generatePassword}>
              Generar
            </Button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Por ahora se crea con contraseña. En futuras iteraciones se enviará
            email con invitación y token de un solo uso.
          </p>
        </div>

        {selectedRole && (
          <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
            <Badge variant="outline" className="mr-2">
              Resumen
            </Badge>
            Se creará <strong>{email || '<email>'}</strong> como{' '}
            <strong>{selectedRole.name}</strong> en tenant{' '}
            <strong>{selectedTenant?.name}</strong>.
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/admin/users')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Creando…' : 'Crear usuario'}
          </Button>
        </div>
      </Card>
    </form>
  )
}
