/**
 * Avisos en-app (Announcement): lista para el admin y resolución de avisos
 * activos por portal para el banner de los portales.
 */

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
 */
export async function getActiveAnnouncements(portal: PortalAudience) {
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
