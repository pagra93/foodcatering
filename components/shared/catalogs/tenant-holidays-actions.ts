'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import {
  toggleHolidayOverrideSchema,
  upsertTenantHolidaySchema,
} from '@/lib/validations/catalogs'

const TENANT_ADMIN_ROLES = ['ADMIN_EMPRESA', 'ADMIN_CATERING', 'SUPER_ADMIN']

/** Permiso de festivos según el portal del tenant (config holidays). */
function holidayPerm(tenantType: string | undefined, action: string): string {
  const resource = tenantType === 'CATERING' ? 'cat-config-holidays' : 'emp-config-holidays'
  return `${resource}:${action}`
}

async function requireTenantAdmin() {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  const tenantId = session.user.tenantId
  if (!tenantId) throw new Error('Tenant no resuelto')
  if (!TENANT_ADMIN_ROLES.includes(session.user.role)) {
    throw new Error('Solo administradores del tenant pueden gestionar festivos')
  }
  return { ...session.user, tenantId }
}

/** Verifica el permiso de festivos por acción (fallback a roles admin del tenant). */
function assertHolidayPerm(
  actor: { permissions?: string[]; role: string; tenantType?: string | null },
  action: string
) {
  const perm = holidayPerm(actor.tenantType ?? undefined, action)
  if (!permittedAction(actor.permissions, actor.role, perm, TENANT_ADMIN_ROLES)) {
    throw new Error('No tienes permiso para gestionar festivos')
  }
}

/**
 * Activa/desactiva un festivo oficial para este tenant.
 * Si disabled=true: el festivo NO se aplica a este tenant (caso 24/7).
 * Si disabled=false y existe override previo: lo borra.
 */
export async function toggleHolidayOverrideAction(
  input: Parameters<typeof toggleHolidayOverrideSchema.parse>[0]
) {
  const actor = await requireTenantAdmin()
  assertHolidayPerm(actor, 'edit')
  const data = toggleHolidayOverrideSchema.parse(input)
  const tenantId = actor.tenantId

  // Validar que el festivo existe y es oficial (NATIONAL/REGION, no TENANT).
  const holiday = await prisma.holiday.findUnique({
    where: { id: data.holidayId },
  })
  if (!holiday) throw new Error('Festivo no encontrado')
  if (holiday.scope === 'TENANT') {
    throw new Error('Solo se pueden overridar festivos oficiales')
  }

  if (data.disabled) {
    // Crear o actualizar override.
    await prisma.holidayOverride.upsert({
      where: {
        tenantId_holidayId: { tenantId, holidayId: data.holidayId },
      },
      update: { disabled: true, notes: data.notes ?? null },
      create: {
        tenantId,
        holidayId: data.holidayId,
        disabled: true,
        notes: data.notes ?? null,
        createdBy: actor.id,
      },
    })
  } else {
    // Borrar override (volver al comportamiento por defecto).
    await prisma.holidayOverride.deleteMany({
      where: { tenantId, holidayId: data.holidayId },
    })
  }

  await logAudit({
    tenantId,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'HolidayOverride',
    entityId: data.holidayId,
    diff: {
      before: null,
      after: {
        holidayId: data.holidayId,
        holidayName: holiday.name,
        disabled: data.disabled,
      },
    },
  })

  revalidatePath('/empresa/configuracion/holidays')
  revalidatePath('/catering/configuracion/holidays')
  return { ok: true }
}

/**
 * Crear o editar un festivo propio del tenant.
 * Scope siempre TENANT, tenantId viene de la sesión.
 */
export async function upsertTenantHolidayAction(
  input: Parameters<typeof upsertTenantHolidaySchema.parse>[0]
) {
  const actor = await requireTenantAdmin()
  assertHolidayPerm(actor, 'edit')
  const data = upsertTenantHolidaySchema.parse(input)
  const tenantId = actor.tenantId

  if (data.id) {
    const before = await prisma.holiday.findUnique({ where: { id: data.id } })
    if (!before) throw new Error('Festivo no encontrado')
    if (before.tenantId !== tenantId) {
      throw new Error('Este festivo no pertenece a tu tenant')
    }
    const updated = await prisma.holiday.update({
      where: { id: data.id },
      data: {
        date: data.date,
        name: data.name,
        description: data.description ?? null,
      },
    })
    await logAudit({
      tenantId,
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'Holiday',
      entityId: updated.id,
      diff: { before: { name: before.name }, after: { name: data.name } },
    })
  } else {
    const created = await prisma.holiday.create({
      data: {
        date: data.date,
        name: data.name,
        description: data.description ?? null,
        scope: 'TENANT',
        tenantId,
        createdBy: actor.id,
      },
    })
    await logAudit({
      tenantId,
      actorId: actor.id,
      action: 'CREATE',
      entity: 'Holiday',
      entityId: created.id,
      diff: {
        before: null,
        after: {
          name: created.name,
          date: created.date.toISOString(),
          scope: 'TENANT',
        },
      },
    })
  }

  revalidatePath('/empresa/configuracion/holidays')
  revalidatePath('/catering/configuracion/holidays')
  return { ok: true }
}

export async function deleteTenantHolidayAction(input: { id: string }) {
  const actor = await requireTenantAdmin()
  assertHolidayPerm(actor, 'delete')
  const tenantId = actor.tenantId

  const current = await prisma.holiday.findUnique({ where: { id: input.id } })
  if (!current) throw new Error('Festivo no encontrado')
  if (current.tenantId !== tenantId) {
    throw new Error('Este festivo no pertenece a tu tenant')
  }

  await prisma.holiday.delete({ where: { id: input.id } })

  await logAudit({
    tenantId,
    actorId: actor.id,
    action: 'DELETE',
    entity: 'Holiday',
    entityId: input.id,
    diff: {
      before: { name: current.name, date: current.date.toISOString() },
      after: null,
    },
  })

  revalidatePath('/empresa/configuracion/holidays')
  revalidatePath('/catering/configuracion/holidays')
  return { ok: true }
}
