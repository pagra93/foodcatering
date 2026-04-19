'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  KeyRound,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
} from 'lucide-react'
import type { UserRole, UserStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ROLE_DESCRIPTIONS } from '@/lib/auth/permissions'
import {
  createCateringUserAction,
  deleteCateringUserAction,
  resetCateringUserPasswordAction,
  toggleCateringUserStatusAction,
  updateCateringUserAction,
} from './actions'

type UserRow = {
  id: string
  email: string
  nameEnc: string
  phoneEnc: string | null
  role: UserRole
  status: UserStatus
  createdAt: Date
}

const STATUS_VARIANT: Record<
  UserStatus,
  'default' | 'destructive' | 'secondary'
> = {
  ACTIVE: 'default',
  PENDING: 'secondary',
  DISABLED: 'destructive',
}

const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  PENDING: 'Pendiente',
  DISABLED: 'Suspendido',
}

const CATERING_ROLES: UserRole[] = [
  'ADMIN_CATERING',
  'CHEF',
  'COCINERO',
  'REPARTIDOR',
  'FINANZAS_CATERING',
]

type CateringRoleLiteral =
  | 'ADMIN_CATERING'
  | 'CHEF'
  | 'COCINERO'
  | 'REPARTIDOR'
  | 'FINANZAS_CATERING'

export function CateringUsersTable({
  users,
  currentUserId,
}: {
  users: UserRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [cEmail, setCEmail] = useState('')
  const [cName, setCName] = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cRole, setCRole] = useState<UserRole>('CHEF')
  const [cPassword, setCPassword] = useState('')

  const resetCreateForm = () => {
    setCEmail('')
    setCName('')
    setCPhone('')
    setCRole('CHEF')
    setCPassword('')
    setShowCreate(false)
  }

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        await createCateringUserAction({
          email: cEmail,
          name: cName,
          phone: cPhone || undefined,
          role: cRole as CateringRoleLiteral,
          password: cPassword,
        })
        toast.success(`${cName} añadido como ${cRole}`)
        resetCreateForm()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const toggleStatus = (u: UserRow) => {
    if (
      !confirm(
        `¿${u.status === 'ACTIVE' ? 'Suspender' : 'Reactivar'} a ${u.nameEnc}?`
      )
    )
      return
    startTransition(async () => {
      try {
        await toggleCateringUserStatusAction({ userId: u.id })
        toast.success('Estado actualizado')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const resetPassword = (u: UserRow) => {
    if (!confirm(`¿Generar nueva contraseña temporal para ${u.nameEnc}?`))
      return
    startTransition(async () => {
      try {
        const { temporaryPassword } = await resetCateringUserPasswordAction({
          userId: u.id,
        })
        setTempPassword(temporaryPassword)
        toast.success('Contraseña generada')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const deleteUser = (u: UserRow) => {
    if (!confirm(`¿Eliminar a ${u.nameEnc}? Se hará soft-delete.`)) return
    startTransition(async () => {
      try {
        await deleteCateringUserAction({ userId: u.id })
        toast.success('Usuario eliminado')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const changeRole = (u: UserRow, newRole: UserRole) => {
    if (newRole === u.role) return
    startTransition(async () => {
      try {
        await updateCateringUserAction({
          userId: u.id,
          role: newRole as CateringRoleLiteral,
        })
        toast.success('Rol actualizado')
        setEditingId(null)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowCreate((p) => !p)}
          variant={showCreate ? 'outline' : 'default'}
        >
          <Plus className="mr-2 h-4 w-4" />
          {showCreate ? 'Cancelar' : 'Añadir usuario'}
        </Button>
      </div>

      {showCreate && (
        <Card className="p-5">
          <form onSubmit={submitCreate} className="space-y-4">
            <h3 className="text-base font-semibold">Nuevo usuario del catering</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="cEmail">Email</Label>
                <Input
                  id="cEmail"
                  type="email"
                  value={cEmail}
                  onChange={(e) => setCEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cName">Nombre</Label>
                <Input
                  id="cName"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cPhone">Teléfono (opcional)</Label>
                <Input
                  id="cPhone"
                  value={cPhone}
                  onChange={(e) => setCPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cRole">Rol</Label>
                <select
                  id="cRole"
                  value={cRole}
                  onChange={(e) => setCRole(e.target.value as UserRole)}
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  required
                >
                  {CATERING_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {ROLE_DESCRIPTIONS[cRole]}
                </p>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="cPassword">Contraseña temporal</Label>
                <Input
                  id="cPassword"
                  value={cPassword}
                  onChange={(e) => setCPassword(e.target.value)}
                  required
                  placeholder="Mínimo 8 caracteres, mayúscula y número"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={resetCreateForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creando…' : 'Crear'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tempPassword && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-900">
            Contraseña temporal generada — cópiala antes de cerrar
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm">
              {tempPassword}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(tempPassword)
                toast.success('Copiada')
              }}
            >
              Copiar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTempPassword(null)}
            >
              Cerrar
            </Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Alta</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUserId
              const isEditingRole = editingId === u.id
              return (
                <tr
                  key={u.id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.nameEnc}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {isEditingRole ? (
                      <select
                        value={u.role}
                        onChange={(e) =>
                          changeRole(u, e.target.value as UserRole)
                        }
                        onBlur={() => setEditingId(null)}
                        autoFocus
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                      >
                        {CATERING_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        type="button"
                        onClick={() => !isSelf && setEditingId(u.id)}
                        className="font-mono text-xs hover:underline disabled:cursor-default disabled:no-underline"
                        disabled={isSelf}
                        title={
                          isSelf
                            ? 'No puedes cambiar tu propio rol'
                            : 'Clic para cambiar'
                        }
                      >
                        {u.role}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[u.status]}>
                      {STATUS_LABEL[u.status]}
                    </Badge>
                    {isSelf && (
                      <span className="ml-2 text-xs text-gray-500">(tú)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {format(u.createdAt, 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetPassword(u)}
                        disabled={isPending}
                        title="Resetear contraseña"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(u)}
                        disabled={isPending || isSelf}
                        title={
                          isSelf
                            ? 'No puedes suspenderte'
                            : 'Suspender/reactivar'
                        }
                      >
                        {u.status === 'ACTIVE' ? (
                          <PauseCircle className="h-4 w-4" />
                        ) : (
                          <PlayCircle className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUser(u)}
                        disabled={isPending || isSelf}
                        className="text-red-600 hover:bg-red-50"
                        title={isSelf ? 'No puedes eliminarte' : 'Eliminar'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  Aún no hay usuarios. Añade el primero con el botón de arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
