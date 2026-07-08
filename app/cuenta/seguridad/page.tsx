/**
 * /cuenta/seguridad — página de seguridad de la cuenta del usuario (F2).
 * Accesible a cualquier usuario autenticado. Hoy alberga el MFA (TOTP).
 */

import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { MfaSettings } from '@/components/cuenta/MfaSettings'

export const metadata = { title: 'Seguridad de la cuenta · Plati' }

export default async function AccountSecurityPage() {
  const session = (await auth()) as Session | null
  if (!session?.user) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Seguridad</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona la seguridad de tu cuenta.
        </p>
      </div>

      <MfaSettings enabled={user?.mfaEnabled ?? false} />
    </div>
  )
}
