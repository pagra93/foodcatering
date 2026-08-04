'use server'

/**
 * Server actions del hilo de seguimiento compartido (penalizaciones e incidencias)
 * y de las notificaciones in-app.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActivityEntity } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getRequiredSession } from '@/lib/auth/session'
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'
import { canAccessEntity, notifyEntityParties } from '@/lib/notifications'

const postSchema = z.object({
  entity: z.enum(['PENALTY', 'INCIDENT']),
  entityId: z.string().uuid(),
  body: z.string().min(1, 'Escribe un mensaje').max(4000),
  isInternal: z.boolean().optional(),
})

function pathsFor(entity: ActivityEntity, entityId: string): string[] {
  if (entity === 'PENALTY') {
    return [`/admin/quality/penalties/${entityId}`, '/catering/calidad']
  }
  return [
    `/admin/incidents/${entityId}`,
    '/catering/incidencias',
    `/catering/incidencias/${entityId}`,
    `/empresa/incidencias/${entityId}`,
    `/empleado/incidencias/${entityId}`,
  ]
}

export async function postMessageAction(
  input: unknown
): Promise<ActionResult<void>> {
  return withAction(async () => {
    const session = await getRequiredSession()
    const { entity, entityId, body, isInternal: wantsInternal } =
      postSchema.parse(input)

    const access = await canAccessEntity(session, entity, entityId)
    if (!access.allowed) {
      throw new DomainError('No tienes acceso a este hilo.', 403)
    }
    // Las notas internas solo las escribe el equipo Plati (ROOT).
    const isInternal = Boolean(wantsInternal) && access.canSeeInternal

    if (!session.user.tenantId) {
      throw new DomainError('Tenant no resuelto', 403)
    }

    await prisma.activityMessage.create({
      data: {
        entity,
        entityId,
        authorId: session.user.id,
        authorTenant: session.user.tenantId,
        authorRole: session.user.role,
        body,
        isInternal,
      },
    })

    // Las notas internas NO notifican a la otra parte.
    if (!isInternal) {
      const author = session.user.name || 'Un participante'
      await notifyEntityParties(entity, entityId, {
        excludeTenantId: session.user.tenantId,
        title:
          entity === 'PENALTY'
            ? 'Nuevo mensaje en una penalización'
            : 'Nuevo mensaje en una incidencia',
        message: `${author}: ${body.slice(0, 140)}`,
      })
    }

    for (const p of pathsFor(entity, entityId)) revalidatePath(p)
  })
}

export async function markNotificationReadAction(input: {
  id: string
}): Promise<ActionResult<void>> {
  return withAction(async () => {
    const session = await getRequiredSession()
    const notif = await prisma.notification.findUnique({
      where: { id: input.id },
    })
    if (!notif) throw new DomainError('Notificación no encontrada', 404)
    // Solo puede marcarla quien la puede ver (su tenant + suya o de todos).
    if (
      notif.tenantId !== session.user.tenantId ||
      (notif.userId !== null && notif.userId !== session.user.id)
    ) {
      throw new DomainError('Sin acceso', 403)
    }
    await prisma.notification.update({
      where: { id: input.id },
      data: { read: true, readAt: new Date() },
    })
  })
}

export async function markAllNotificationsReadAction(): Promise<
  ActionResult<void>
> {
  return withAction(async () => {
    const session = await getRequiredSession()
    if (!session.user.tenantId) {
      throw new DomainError('Tenant no resuelto', 403)
    }
    await prisma.notification.updateMany({
      where: {
        tenantId: session.user.tenantId,
        read: false,
        OR: [{ userId: null }, { userId: session.user.id }],
      },
      data: { read: true, readAt: new Date() },
    })
  })
}
