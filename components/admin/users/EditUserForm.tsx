'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import type { UserRole, TenantType } from '@prisma/client'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateUserAction } from './actions'

type Props = {
  user: {
    id: string
    email: string
    nameEnc: string
    phoneEnc: string | null
    role: UserRole
    roleId: string | null
  }
  tenant: { name: string; type: TenantType }
  /** Roles del RBAC (sistema + custom) válidos para la categoría del tenant. */
  roles: { id: string; name: string; isSystem: boolean }[]
  currentUserId: string
}

export function EditUserForm({ user, tenant, roles, currentUserId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState(user.email)
  const [name, setName] = useState(user.nameEnc)
  const [phone, setPhone] = useState(user.phoneEnc ?? '')
  const [roleId, setRoleId] = useState<string>(user.roleId ?? roles[0]?.id ?? '')

  const isSelf = currentUserId === user.id
  const isRoleChanging = roleId !== user.roleId
  const currentIsSuperAdmin = user.role === 'SUPER_ADMIN'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isSelf && currentIsSuperAdmin && isRoleChanging) {
      const confirmed = confirm(
        '¡Atención! Vas a cambiar tu propio rol de SUPER_ADMIN. Podrías perder acceso al portal de administración. ¿Continuar?'
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
          roleId,
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
          <div className="flex items-start gap-2 rounded-md bg-primary/10 p-3 text-sm text-primary">
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
          {roles.length === 0 ? (
            <p className="mt-1 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
              No hay roles configurados para este tipo de tenant ({tenant.type}).
              Crea uno en{' '}
              <Link href="/admin/users/roles" className="underline">
                Roles y permisos
              </Link>
              .
            </p>
          ) : (
            <select
              id="role"
              aria-label="Rol del usuario"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.isSystem ? ' (sistema)' : ''}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 text-xs text-gray-500">
            El rol define los permisos y las secciones visibles. Gestiónalos en{' '}
            <Link href="/admin/users/roles" className="underline">
              Roles y permisos
            </Link>
            .
          </p>
          {isRoleChanging && (
            <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                Vas a cambiar el rol de este usuario. Verá secciones y permisos
                distintos desde el próximo login.
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
