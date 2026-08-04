'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'
import { ALL_RATE_LIMITERS } from '@/lib/ratelimit'

export async function resetRateLimiterKeyAction(input: {
  limiter: string
  key: string
}): Promise<ActionResult<null>> {
  return withAction(async () => {
    const session = (await auth()) as Session | null
    if (!session?.user) throw new DomainError('Sesión requerida', 403)
    if (!permittedAction(session.user.permissions, session.user.role, 'rate-limit:edit', ['SUPER_ADMIN'])) {
      throw new DomainError('No tienes permiso para esta acción', 403)
    }

    const limiter = ALL_RATE_LIMITERS[input.limiter]
    if (!limiter) {
      throw new DomainError(`Limiter desconocido: ${input.limiter}`, 404)
    }

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
    return null
  })
}
