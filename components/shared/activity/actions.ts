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
import { canAccessEntity, notifyEntityParties } from '@/lib/notifications'

type Result = { ok?: boolean; error?: string }

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

export async function postMessageAction(input: unknown): Promise<Result> {
  const session = await getRequiredSession()
  const parsed = postSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }
  const { entity, entityId, body } = parsed.data

  const access = await canAccessEntity(session, entity, entityId)
  if (!access.allowed) return { error: 'No tienes acceso a este hilo.' }
  // Las notas internas solo las escribe el equipo Plati (ROOT).
  const isInternal = Boolean(parsed.data.isInternal) && access.canSeeInternal

  if (!session.user.tenantId) return { error: 'Tenant no resuelto' }

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
  return { ok: true }
}

export async function markNotificationReadAction(input: {
  id: string
}): Promise<Result> {
  const session = await getRequiredSession()
  const notif = await prisma.notification.findUnique({ where: { id: input.id } })
  if (!notif) return { error: 'Notificación no encontrada' }
  // Solo puede marcarla quien la puede ver (su tenant + suya o de todos).
  if (
    notif.tenantId !== session.user.tenantId ||
    (notif.userId !== null && notif.userId !== session.user.id)
  ) {
    return { error: 'Sin acceso' }
  }
  await prisma.notification.update({
    where: { id: input.id },
    data: { read: true, readAt: new Date() },
  })
  return { ok: true }
}

export async function markAllNotificationsReadAction(): Promise<Result> {
  const session = await getRequiredSession()
  if (!session.user.tenantId) return { error: 'Tenant no resuelto' }
  await prisma.notification.updateMany({
    where: {
      tenantId: session.user.tenantId,
      read: false,
      OR: [{ userId: null }, { userId: session.user.id }],
    },
    data: { read: true, readAt: new Date() },
  })
  return { ok: true }
}
