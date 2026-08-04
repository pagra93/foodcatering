'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'
import { upsertAnnouncementSchema } from '@/lib/validations/announcement'

async function requireSuperAdmin(permission: string) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new DomainError('Sesión requerida', 403)
  if (!permittedAction(session.user.permissions, session.user.role, permission, ['SUPER_ADMIN'])) {
    throw new DomainError('No tienes permiso para esta acción', 403)
  }
  return session.user
}

/** Revalida el admin y los layouts de portal (para que el banner refresque). */
function revalidateAll() {
  // Invalida la caché de getActiveAnnouncements (B7) en todos los portales.
  revalidateTag('announcements')
  revalidatePath('/admin/templates/announcements')
  revalidatePath('/empresa', 'layout')
  revalidatePath('/catering', 'layout')
  revalidatePath('/empleado', 'layout')
}

export async function upsertAnnouncementAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const d = upsertAnnouncementSchema.parse(input)

    const actor = await requireSuperAdmin(d.id ? 'announcement:edit' : 'announcement:create')

    const data = {
      title: d.title,
      body: d.body,
      severity: d.severity,
      audience: d.audience,
      startsAt: d.startsAt ?? null,
      endsAt: d.endsAt ?? null,
      dismissible: d.dismissible,
      active: d.active,
    }

    const row = d.id
      ? await prisma.announcement.update({ where: { id: d.id }, data })
      : await prisma.announcement.create({ data: { ...data, createdBy: actor.id } })

    await logAudit({
      actorId: actor.id,
      action: d.id ? 'UPDATE' : 'CREATE',
      entity: 'Announcement',
      entityId: row.id,
      diff: { before: null, after: { title: d.title, audience: d.audience, active: d.active } },
    })

    revalidateAll()
    return { id: row.id }
  })
}

export async function toggleAnnouncementAction(
  id: string,
  active: boolean
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('announcement:publish')
    const row = await prisma.announcement.update({ where: { id }, data: { active } })
    await logAudit({
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'Announcement',
      entityId: row.id,
      diff: { before: null, after: { active } },
    })
    revalidateAll()
    return null
  })
}

export async function deleteAnnouncementAction(id: string): Promise<ActionResult<null>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('announcement:edit')
    await prisma.announcement.delete({ where: { id } })
    await logAudit({
      actorId: actor.id,
      action: 'DELETE',
      entity: 'Announcement',
      entityId: id,
    })
    revalidateAll()
    return null
  })
}
