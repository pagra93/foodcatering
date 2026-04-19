'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import {
  cancelMaintenanceSchema,
  scheduleMaintenanceSchema,
} from '@/lib/validations/maintenance'

async function requireSuperAdmin() {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Acción reservada al super admin')
  }
  return session.user
}

export async function scheduleMaintenanceAction(
  input: Parameters<typeof scheduleMaintenanceSchema.parse>[0]
) {
  const actor = await requireSuperAdmin()
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

  revalidatePath('/admin/operations/maintenance')
  revalidatePath('/admin/operations')
  return { id: window.id }
}

export async function cancelMaintenanceAction(input: { id: string }) {
  const actor = await requireSuperAdmin()
  const { id } = cancelMaintenanceSchema.parse(input)

  const current = await prisma.maintenanceWindow.findUnique({ where: { id } })
  if (!current) throw new Error('Ventana no encontrada')
  if (current.disabledAt) throw new Error('Ya está cancelada')

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

  revalidatePath('/admin/operations/maintenance')
  revalidatePath('/admin/operations')
}
