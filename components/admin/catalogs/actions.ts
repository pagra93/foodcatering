'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'
import {
  upsertAllergenSchema,
  upsertIncidentReasonSchema,
  upsertOfficialHolidaySchema,
} from '@/lib/validations/catalogs'

async function requireSuperAdmin(permission: string) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new DomainError('Sesión requerida', 403)
  if (!permittedAction(session.user.permissions, session.user.role, permission, ['SUPER_ADMIN'])) {
    throw new DomainError('No tienes permiso para esta acción', 403)
  }
  return session.user
}

// ─── Alérgenos ─────────────────────────────────────────────────────────

export async function upsertAllergenAction(
  input: Parameters<typeof upsertAllergenSchema.parse>[0]
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('allergen:create')
    const data = upsertAllergenSchema.parse(input)

    const { id, ...rest } = data

    if (id) {
      const before = await prisma.allergen.findUnique({ where: { id } })
      if (!before) throw new DomainError('Alérgeno no encontrado', 404)

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
    return null
  })
}

export async function toggleAllergenAction(input: {
  id: string
  active: boolean
}): Promise<ActionResult<null>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('allergen:edit')
    const current = await prisma.allergen.findUnique({ where: { id: input.id } })
    if (!current) throw new DomainError('Alérgeno no encontrado', 404)

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
    return null
  })
}

// ─── Motivos de incidencia ─────────────────────────────────────────────

export async function upsertIncidentReasonAction(
  input: Parameters<typeof upsertIncidentReasonSchema.parse>[0]
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('incident-reason:create')
    const data = upsertIncidentReasonSchema.parse(input)
    const { id, ...rest } = data

    if (id) {
      const before = await prisma.incidentReason.findUnique({ where: { id } })
      if (!before) throw new DomainError('Motivo no encontrado', 404)
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

    revalidatePath('/admin/incidents/reasons')
    return null
  })
}

export async function toggleIncidentReasonAction(input: {
  id: string
  active: boolean
}): Promise<ActionResult<null>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('incident-reason:edit')
    const current = await prisma.incidentReason.findUnique({ where: { id: input.id } })
    if (!current) throw new DomainError('Motivo no encontrado', 404)

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

    revalidatePath('/admin/incidents/reasons')
    return null
  })
}

// ─── Festivos oficiales ────────────────────────────────────────────────

export async function upsertOfficialHolidayAction(
  input: Parameters<typeof upsertOfficialHolidaySchema.parse>[0]
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('calendar:create')
    const data = upsertOfficialHolidaySchema.parse(input)
    const { id, ...rest } = data

    if (id) {
      const before = await prisma.holiday.findUnique({ where: { id } })
      if (!before) throw new DomainError('Festivo no encontrado', 404)
      if (before.scope === 'TENANT') {
        throw new DomainError('No se puede editar un festivo de tenant desde admin', 400)
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
    return null
  })
}

export async function deleteOfficialHolidayAction(input: {
  id: string
}): Promise<ActionResult<null>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('calendar:delete')
    const current = await prisma.holiday.findUnique({ where: { id: input.id } })
    if (!current) throw new DomainError('Festivo no encontrado', 404)
    if (current.scope === 'TENANT') {
      throw new DomainError('No se puede borrar un festivo de tenant desde admin', 400)
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
    return null
  })
}
