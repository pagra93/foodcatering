/**
 * Lectura de hilos de seguimiento (`ActivityMessage`) y notificaciones in-app.
 */

import { prisma } from '@/lib/db/prisma'
import type { ActivityEntity } from '@prisma/client'
import { decryptNameSafe } from '@/lib/crypto/pii'
import { getRoleCategory } from '@/lib/auth/permissions'

export type ThreadMessage = {
  id: string
  body: string
  isInternal: boolean
  createdAt: Date
  author: {
    id: string
    name: string
    role: string
    tenantName: string
    side: 'admin' | 'catering' | 'empresa' | 'other'
  }
}

/**
 * Mensajes de un hilo, ordenados cronológicamente. Filtra las notas internas
 * si el que mira no es del equipo Plati (ROOT).
 */
export async function getThreadMessages(
  entity: ActivityEntity,
  entityId: string,
  canSeeInternal: boolean
): Promise<ThreadMessage[]> {
  const messages = await prisma.activityMessage.findMany({
    where: {
      entity,
      entityId,
      ...(canSeeInternal ? {} : { isInternal: false }),
    },
    orderBy: { createdAt: 'asc' },
  })
  if (messages.length === 0) return []

  const authorIds = [...new Set(messages.map((m) => m.authorId))]
  const tenantIds = [...new Set(messages.map((m) => m.authorTenant))]
  const [users, tenants] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, nameEnc: true, email: true },
    }),
    prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, type: true },
    }),
  ])
  const userById = new Map(users.map((u) => [u.id, u]))
  const tenantById = new Map(tenants.map((t) => [t.id, t]))

  return messages.map((m) => {
    const u = userById.get(m.authorId)
    const t = tenantById.get(m.authorTenant)
    const side =
      t?.type === 'ROOT'
        ? 'admin'
        : t?.type === 'CATERING'
          ? 'catering'
          : t?.type === 'EMPRESA'
            ? 'empresa'
            : 'other'
    return {
      id: m.id,
      body: m.body,
      isInternal: m.isInternal,
      createdAt: m.createdAt,
      author: {
        id: m.authorId,
        name: u ? decryptNameSafe(u.nameEnc, u.email) : 'Usuario',
        role: m.authorRole,
        tenantName: t?.name ?? '—',
        side,
      },
    }
  })
}

/** Notificaciones no leídas visibles para un usuario (suyas o de todo su tenant). */
export async function getUnreadNotifications(
  tenantId: string,
  userId: string,
  limit = 15
) {
  return prisma.notification.findMany({
    where: {
      tenantId,
      read: false,
      OR: [{ userId: null }, { userId }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getUnreadCount(tenantId: string, userId: string) {
  return prisma.notification.count({
    where: {
      tenantId,
      read: false,
      OR: [{ userId: null }, { userId }],
    },
  })
}

/** Helper de conveniencia: ¿es el usuario del equipo Plati (ROOT)? */
export function isRootRoleCategory(role: string) {
  return getRoleCategory(role as never) === 'ROOT'
}
