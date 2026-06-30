'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { ALL_RATE_LIMITERS } from '@/lib/ratelimit'

export async function resetRateLimiterKeyAction(input: {
  limiter: string
  key: string
}) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (!permittedAction(session.user.permissions, session.user.role, 'rate-limit:edit', ['SUPER_ADMIN'])) {
    throw new Error('No tienes permiso para esta acción')
  }

  const limiter = ALL_RATE_LIMITERS[input.limiter]
  if (!limiter) throw new Error(`Limiter desconocido: ${input.limiter}`)

  limiter.reset(input.key)

  await logAudit({
    actorId: session.user.id,
    action: 'UPDATE',
    entity: 'RateLimiter',
    entityId: `${input.limiter}:${input.key}`,
    diff: {
      before: { reset: true },
      after: null,
    },
  })

  revalidatePath('/admin/operations/rate-limiting')
}
