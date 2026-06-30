'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import {
  upsertAllergenSchema,
  upsertIncidentReasonSchema,
  upsertOfficialHolidaySchema,
} from '@/lib/validations/catalogs'

async function requireSuperAdmin(permission: string) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (!permittedAction(session.user.permissions, session.user.role, permission, ['SUPER_ADMIN'])) {
    throw new Error('No tienes permiso para esta acción')
  }
  return session.user
}

// ─── Alérgenos ─────────────────────────────────────────────────────────

export async function upsertAllergenAction(
  input: Parameters<typeof upsertAllergenSchema.parse>[0]
) {
  const actor = await requireSuperAdmin('allergen:create')
  const data = upsertAllergenSchema.parse(input)

  const { id, ...rest } = data

  if (id) {
    const before = await prisma.allergen.findUnique({ where: { id } })
    if (!before) throw new Error('Alérgeno no encontrado')

    const updated = await prisma.allergen.update({
      where: { id },
      data: rest,
    })

    await logAudit({
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'Allergen',
      entityId: updated.id,
      diff: { before: { name: before.name, active: before.active }, after: rest },
    })
  } else {
    const created = await prisma.allergen.create({ data: rest })
    await logAudit({
      actorId: actor.id,
      action: 'CREATE',
      entity: 'Allergen',
      entityId: created.id,
      diff: { before: null, after: { name: created.name, code: created.code } },
    })
  }

  revalidatePath('/admin/catalogs/allergens')
  return { ok: true }
}

export async function toggleAllergenAction(input: { id: string; active: boolean }) {
  const actor = await requireSuperAdmin('allergen:edit')
  const current = await prisma.allergen.findUnique({ where: { id: input.id } })
  if (!current) throw new Error('Alérgeno no encontrado')

  await prisma.allergen.update({
    where: { id: input.id },
    data: { active: input.active },
  })

  await logAudit({
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'Allergen',
    entityId: input.id,
    diff: { before: { active: current.active }, after: { active: input.active } },
  })

  revalidatePath('/admin/catalogs/allergens')
  return { ok: true }
}

// ─── Motivos de incidencia ─────────────────────────────────────────────

export async function upsertIncidentReasonAction(
  input: Parameters<typeof upsertIncidentReasonSchema.parse>[0]
) {
  const actor = await requireSuperAdmin('incident-reason:create')
  const data = upsertIncidentReasonSchema.parse(input)
  const { id, ...rest } = data

  if (id) {
    const before = await prisma.incidentReason.findUnique({ where: { id } })
    if (!before) throw new Error('Motivo no encontrado')
    const updated = await prisma.incidentReason.update({
      where: { id },
      data: { ...rest, scope: 'SYSTEM', tenantId: null },
    })
    await logAudit({
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'IncidentReason',
      entityId: updated.id,
      diff: { before: { name: before.name }, after: { name: rest.name } },
    })
  } else {
    const created = await prisma.incidentReason.create({
      data: { ...rest, scope: 'SYSTEM' },
    })
    await logAudit({
      actorId: actor.id,
      action: 'CREATE',
      entity: 'IncidentReason',
      entityId: created.id,
      diff: { before: null, after: { name: created.name, code: created.code } },
    })
  }

  revalidatePath('/admin/quality/incident-reasons')
  return { ok: true }
}

export async function toggleIncidentReasonAction(input: {
  id: string
  active: boolean
}) {
  const actor = await requireSuperAdmin('incident-reason:edit')
  const current = await prisma.incidentReason.findUnique({ where: { id: input.id } })
  if (!current) throw new Error('Motivo no encontrado')

  await prisma.incidentReason.update({
    where: { id: input.id },
    data: { active: input.active },
  })

  await logAudit({
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'IncidentReason',
    entityId: input.id,
    diff: { before: { active: current.active }, after: { active: input.active } },
  })

  revalidatePath('/admin/quality/incident-reasons')
  return { ok: true }
}

// ─── Festivos oficiales ────────────────────────────────────────────────

export async function upsertOfficialHolidayAction(
  input: Parameters<typeof upsertOfficialHolidaySchema.parse>[0]
) {
  const actor = await requireSuperAdmin('calendar:create')
  const data = upsertOfficialHolidaySchema.parse(input)
  const { id, ...rest } = data

  if (id) {
    const before = await prisma.holiday.findUnique({ where: { id } })
    if (!before) throw new Error('Festivo no encontrado')
    if (before.scope === 'TENANT') {
      throw new Error('No se puede editar un festivo de tenant desde admin')
    }
    const updated = await prisma.holiday.update({
      where: { id },
      data: rest,
    })
    await logAudit({
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'Holiday',
      entityId: updated.id,
      diff: { before: { name: before.name }, after: { name: rest.name } },
    })
  } else {
    const created = await prisma.holiday.create({
      data: { ...rest, createdBy: actor.id },
    })
    await logAudit({
      actorId: actor.id,
      action: 'CREATE',
      entity: 'Holiday',
      entityId: created.id,
      diff: {
        before: null,
        after: { name: created.name, scope: created.scope, date: created.date.toISOString() },
      },
    })
  }

  revalidatePath('/admin/catalogs/calendars')
  return { ok: true }
}

export async function deleteOfficialHolidayAction(input: { id: string }) {
  const actor = await requireSuperAdmin('calendar:delete')
  const current = await prisma.holiday.findUnique({ where: { id: input.id } })
  if (!current) throw new Error('Festivo no encontrado')
  if (current.scope === 'TENANT') {
    throw new Error('No se puede borrar un festivo de tenant desde admin')
  }

  await prisma.holiday.delete({ where: { id: input.id } })

  await logAudit({
    actorId: actor.id,
    action: 'DELETE',
    entity: 'Holiday',
    entityId: input.id,
    diff: {
      before: { name: current.name, date: current.date.toISOString() },
      after: null,
    },
  })

  revalidatePath('/admin/catalogs/calendars')
  return { ok: true }
}
