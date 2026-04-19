'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { UserRole, TenantType } from '@prisma/client'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROLE_DESCRIPTIONS, rolesByTenantType } from '@/lib/auth/permissions'
import { updateUserAction } from './actions'

type Props = {
  user: {
    id: string
    email: string
    nameEnc: string
    phoneEnc: string | null
    role: UserRole
  }
  tenant: { name: string; type: TenantType }
  currentUserId: string
}

export function EditUserForm({ user, tenant, currentUserId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState(user.email)
  const [name, setName] = useState(user.nameEnc)
  const [phone, setPhone] = useState(user.phoneEnc ?? '')
  const [role, setRole] = useState<UserRole>(user.role)

  const availableRoles = rolesByTenantType(tenant.type)
  const isSelf = currentUserId === user.id
  const isRoleChanging = role !== user.role
  const isDowngradingOwnSuperAdmin =
    isSelf && user.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isDowngradingOwnSuperAdmin) {
      const confirmed = confirm(
        '¡Atención! Vas a quitarte el rol SUPER_ADMIN a ti mismo. Perderás acceso al portal de administración. ¿Continuar?'
      )
      if (!confirmed) return
    }

    startTransition(async () => {
      try {
        await updateUserAction({
          userId: user.id,
          email,
          name,
          phone: phone || undefined,
          role,
        })
        toast.success('Usuario actualizado')
        router.push(`/admin/users/${user.id}`)
        router.refresh()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error al actualizar'
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <form onSubmit={submit}>
      <Card className="max-w-2xl space-y-5 p-6">
        {isSelf && (
          <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              Estás editando <strong>tu propia cuenta</strong>. Los cambios de
              rol afectan inmediatamente a tu sesión actual.
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="phone">Teléfono (opcional)</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+34 600 000 000"
          />
        </div>

        <div>
          <Label htmlFor="role">Rol</Label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            required
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {ROLE_DESCRIPTIONS[role]}
          </p>
          {isRoleChanging && (
            <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                Cambio de rol: <strong>{user.role}</strong> →{' '}
                <strong>{role}</strong>. El usuario podrá ver/hacer cosas
                distintas desde el próximo login.
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Tenant: <strong>{tenant.name}</strong> ({tenant.type}) — no editable.
          Para mover un usuario de tenant, elimínalo y créalo en el destino.
        </p>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(`/admin/users/${user.id}`)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </Card>
    </form>
  )
}
