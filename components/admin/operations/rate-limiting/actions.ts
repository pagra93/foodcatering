'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { ALL_RATE_LIMITERS } from '@/lib/ratelimit'

export async function resetRateLimiterKeyAction(input: {
  limiter: string
  key: string
}) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Acción reservada al super admin')
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
