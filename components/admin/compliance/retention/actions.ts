'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import type { RetentionEntity } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { updateRetentionPolicySchema } from '@/lib/validations/compliance'
import { RETENTION_DEFAULTS } from '@/lib/db/queries/admin-retention'

async function requireSuperAdmin(permission: string) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (!permittedAction(session.user.permissions, session.user.role, permission, ['SUPER_ADMIN'])) {
    throw new Error('No tienes permiso para esta acción')
  }
  return session.user
}

export async function upsertRetentionPolicyAction(input: {
  entity: RetentionEntity
  retentionDays: number
  deleteMode: 'SOFT' | 'HARD'
}) {
  const actor = await requireSuperAdmin('retention:edit')
  const data = updateRetentionPolicySchema.parse(input)

  const policy = await prisma.retentionPolicy.upsert({
    where: { entity: data.entity },
    update: {
      retentionDays: data.retentionDays,
      deleteMode: data.deleteMode,
      updatedBy: actor.id,
    },
    create: {
      entity: data.entity,
      retentionDays: data.retentionDays,
      deleteMode: data.deleteMode,
      updatedBy: actor.id,
    },
  })

  await logAudit({
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'RetentionPolicy',
    entityId: policy.id,
    diff: {
      before: null,
      after: {
        entity: data.entity,
        retentionDays: data.retentionDays,
        deleteMode: data.deleteMode,
      },
    },
  })

  revalidatePath('/admin/compliance/retention')
  return { id: policy.id }
}

/**
 * Inicializa las políticas con los defaults sugeridos si no existen.
 */
export async function seedRetentionDefaultsAction() {
  const actor = await requireSuperAdmin('retention:edit')

  const existing = await prisma.retentionPolicy.findMany({
    select: { entity: true },
  })
  const existingSet = new Set(existing.map((e) => e.entity))

  const toCreate = Object.entries(RETENTION_DEFAULTS)
    .filter(([entity]) => !existingSet.has(entity as RetentionEntity))
    .map(([entity, cfg]) => ({
      entity: entity as RetentionEntity,
      retentionDays: cfg.days,
      deleteMode: cfg.mode,
      updatedBy: actor.id,
    }))

  if (toCreate.length === 0) {
    return { created: 0 }
  }

  await prisma.retentionPolicy.createMany({ data: toCreate })

  await logAudit({
    actorId: actor.id,
    action: 'CREATE',
    entity: 'RetentionPolicy',
    entityId: 'bulk',
    diff: { before: null, after: { count: toCreate.length } },
  })

  revalidatePath('/admin/compliance/retention')
  return { created: toCreate.length }
}
