/**
 * Avisos en-app (Announcement): lista para el admin y resolución de avisos
 * activos por portal para el banner de los portales.
 */

import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import type { AnnouncementAudience } from '@prisma/client'

export type PortalAudience = 'EMPRESA' | 'CATERING' | 'EMPLEADO'

/** Todos los avisos (admin), más recientes primero. */
export async function getAnnouncements() {
  return prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } })
}

/**
 * Avisos activos que aplican a un portal AHORA: `active`, dentro de la ventana
 * temporal (startsAt/endsAt nulos = sin límite) y audiencia ALL o la del portal.
 *
 * Cacheado (B7) con tag 'announcements' — lo consultan los 3 layouts en cada
 * navegación y cambia rara vez; las actions de avisos invalidan el tag y hay
 * revalidate 300 s de red de seguridad. (El select devuelve solo escalares
 * serializables, apto para unstable_cache.)
 */
export async function getActiveAnnouncements(portal: PortalAudience) {
  return unstable_cache(
    () => loadActiveAnnouncements(portal),
    ['active-announcements', portal],
    { tags: ['announcements'], revalidate: 300 }
  )()
}

async function loadActiveAnnouncements(portal: PortalAudience) {
  const now = new Date()
  const audiences: AnnouncementAudience[] = ['ALL', portal]
  return prisma.announcement.findMany({
    where: {
      active: true,
      audience: { in: audiences },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      body: true,
      severity: true,
      dismissible: true,
    },
  })
}

export type ActiveAnnouncement = Awaited<
  ReturnType<typeof getActiveAnnouncements>
>[number]
