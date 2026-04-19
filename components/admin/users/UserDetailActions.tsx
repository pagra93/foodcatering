'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Edit,
  KeyRound,
  PauseCircle,
  PlayCircle,
  Trash2,
  UserCog,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  deleteUserAction,
  resetPasswordAction,
  setUserStatusAction,
} from './actions'

type Props = {
  userId: string
  currentStatus: 'ACTIVE' | 'DISABLED' | 'PENDING'
  isSelf: boolean
}

export function UserDetailActions({ userId, currentStatus, isSelf }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const toggleStatus = () => {
    const next = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    const actionLabel = next === 'ACTIVE' ? 'reactivar' : 'suspender'
    if (!confirm(`¿Seguro que quieres ${actionLabel} este usuario?`)) return

    startTransition(async () => {
      try {
        await setUserStatusAction({ userId, status: next })
        toast.success(next === 'ACTIVE' ? 'Usuario reactivado' : 'Usuario suspendido')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const resetPassword = () => {
    if (!confirm('Se generará una contraseña temporal nueva. ¿Continuar?')) return

    startTransition(async () => {
      try {
        const { temporaryPassword } = await resetPasswordAction({ userId })
        setTempPassword(temporaryPassword)
        toast.success('Contraseña temporal generada — cópiala antes de cerrar')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const deleteUser = () => {
    if (
      !confirm(
        'El usuario quedará suspendido (soft-delete). Los datos se conservan. ¿Continuar?'
      )
    )
      return

    startTransition(async () => {
      try {
        await deleteUserAction({ userId })
        toast.success('Usuario eliminado')
        router.push('/admin/users')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const copyPassword = async () => {
    if (!tempPassword) return
    await navigator.clipboard.writeText(tempPassword)
    toast.success('Copiada al portapapeles')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={`/admin/users/${userId}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={resetPassword}
          disabled={isPending}
        >
          <KeyRound className="mr-2 h-4 w-4" />
          Resetear contraseña
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleStatus}
          disabled={isPending || isSelf}
          title={isSelf ? 'No puedes suspender tu propia cuenta' : ''}
        >
          {currentStatus === 'ACTIVE' ? (
            <>
              <PauseCircle className="mr-2 h-4 w-4" />
              Suspender
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-4 w-4" />
              Reactivar
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={deleteUser}
          disabled={isPending || isSelf}
          title={isSelf ? 'No puedes eliminar tu propia cuenta' : ''}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </Button>

        <Button variant="ghost" size="sm" asChild className="ml-auto">
          <Link href={`/admin/users/${userId}/edit`}>
            <UserCog className="mr-2 h-4 w-4" />
            Cambiar rol
          </Link>
        </Button>
      </div>

      {tempPassword && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-900">
              Contraseña temporal generada
            </p>
            <button
              onClick={() => setTempPassword(null)}
              className="text-xs text-amber-700 hover:text-amber-900"
            >
              Cerrar
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm">
              {tempPassword}
            </code>
            <Button variant="outline" size="sm" onClick={copyPassword}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar
            </Button>
          </div>
          <p className="mt-2 text-xs text-amber-800">
            Cópiala y entrégasela al usuario por un canal seguro. No se podrá
            volver a mostrar.
          </p>
        </div>
      )}
    </div>
  )
}
