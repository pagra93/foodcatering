'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'
import {
  cancelMaintenanceSchema,
  scheduleMaintenanceSchema,
} from '@/lib/validations/maintenance'

async function requireSuperAdmin(permission: string) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new DomainError('Sesión requerida', 403)
  if (!permittedAction(session.user.permissions, session.user.role, permission, ['SUPER_ADMIN'])) {
    throw new DomainError('No tienes permiso para esta acción', 403)
  }
  return session.user
}

export async function scheduleMaintenanceAction(
  input: Parameters<typeof scheduleMaintenanceSchema.parse>[0]
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('maintenance:run')
    const data = scheduleMaintenanceSchema.parse(input)

    const window = await prisma.maintenanceWindow.create({
      data: {
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        reason: data.reason,
        message: data.message,
        allowedRoles: data.allowedRoles,
        enabledBy: actor.id,
      },
    })

    await logAudit({
      actorId: actor.id,
      action: 'CREATE',
      entity: 'MaintenanceWindow',
      entityId: window.id,
      diff: {
        before: null,
        after: {
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          reason: data.reason,
        },
      },
    })

    revalidateTag('maintenance')
    revalidatePath('/admin/operations/maintenance')
    revalidatePath('/admin/operations')
    return { id: window.id }
  })
}

export async function cancelMaintenanceAction(input: {
  id: string
}): Promise<ActionResult<null>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('maintenance:run')
    const { id } = cancelMaintenanceSchema.parse(input)

    const current = await prisma.maintenanceWindow.findUnique({ where: { id } })
    if (!current) throw new DomainError('Ventana no encontrada', 404)
    if (current.disabledAt) throw new DomainError('Ya está cancelada', 409)

    await prisma.maintenanceWindow.update({
      where: { id },
      data: {
        disabledAt: new Date(),
        disabledBy: actor.id,
      },
    })

    await logAudit({
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'MaintenanceWindow',
      entityId: id,
      diff: {
        before: { disabledAt: null },
        after: { disabledAt: new Date() },
      },
    })

    revalidateTag('maintenance')
    revalidatePath('/admin/operations/maintenance')
    revalidatePath('/admin/operations')
    return null
  })
}
