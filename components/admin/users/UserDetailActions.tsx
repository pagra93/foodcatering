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
  ShieldOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  deleteUserAction,
  resetPasswordAction,
  resetMfaAction,
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
  const [resetNotice, setResetNotice] = useState<
    { ok: boolean; text: string } | null
  >(null)

  const toggleStatus = () => {
    const next = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    const actionLabel = next === 'ACTIVE' ? 'reactivar' : 'suspender'
    if (!confirm(`¿Seguro que quieres ${actionLabel} este usuario?`)) return

    startTransition(async () => {
      const res = await setUserStatusAction({ userId, status: next })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success(next === 'ACTIVE' ? 'Usuario reactivado' : 'Usuario suspendido')
      router.refresh()
    })
  }

  const resetPassword = () => {
    if (
      !confirm(
        'Se enviará al usuario un enlace por email para restablecer su contraseña. ¿Continuar?'
      )
    )
      return

    startTransition(async () => {
      const res = await resetPasswordAction({ userId })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      const { emailed, email } = res.data
      setResetNotice({
        ok: emailed,
        text: emailed
          ? `Enlace de restablecimiento enviado a ${email}.`
          : `No se pudo enviar el email a ${email}. Revisa la configuración de correo (RESEND_API_KEY).`,
      })
      toast[emailed ? 'success' : 'error'](
        emailed ? 'Email enviado' : 'Email no enviado'
      )
    })
  }

  const resetMfa = () => {
    if (
      !confirm(
        '¿Desactivar la verificación en dos pasos de este usuario? Úsalo si perdió el móvil y sus códigos de recuperación.'
      )
    )
      return

    startTransition(async () => {
      const res = await resetMfaAction({ userId })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('MFA reseteado')
      router.refresh()
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
      const res = await deleteUserAction({ userId })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Usuario eliminado')
      router.push('/admin/users')
      router.refresh()
    })
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
          onClick={resetMfa}
          disabled={isPending}
          title="Desactiva el MFA del usuario (recuperación de bloqueo)"
        >
          <ShieldOff className="mr-2 h-4 w-4" />
          Resetear MFA
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

      {resetNotice && (
        <div
          className={`rounded-md border p-4 ${resetNotice.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}
        >
          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-sm font-medium ${resetNotice.ok ? 'text-emerald-900' : 'text-amber-900'}`}
            >
              {resetNotice.text}
            </p>
            <button
              onClick={() => setResetNotice(null)}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
