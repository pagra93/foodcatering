'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import {
  applyPenaltySchema,
  createPenaltySchema,
  disputePenaltySchema,
  waivePenaltySchema,
} from '@/lib/validations/penalty'
import type {
  CreatePenaltyInput,
} from '@/lib/validations/penalty'

async function requireSuperAdmin() {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Solo SUPER_ADMIN puede gestionar penalizaciones')
  }
  return session.user
}

async function requireCateringAdminOfTenant(tenantCatering: string) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (session.user.role !== 'ADMIN_CATERING' || session.user.tenantId !== tenantCatering) {
    throw new Error('Sólo el ADMIN_CATERING del tenant afectado puede disputar')
  }
  return session.user
}

export async function createPenaltyAction(input: CreatePenaltyInput) {
  const actor = await requireSuperAdmin()
  const data = createPenaltySchema.parse(input)

  // Verificar que el tenantCatering existe y es CATERING.
  const tenant = await prisma.tenant.findUnique({
    where: { id: data.tenantCatering },
    select: { id: true, type: true, name: true },
  })
  if (!tenant) throw new Error('Catering no encontrado')
  if (tenant.type !== 'CATERING') {
    throw new Error('El tenant indicado no es de tipo CATERING')
  }

  const penalty = await prisma.penalty.create({
    data: {
      tenantCatering: data.tenantCatering,
      companyId: data.companyId,
      type: data.type,
      reason: data.reason,
      amount: data.amount,
      appliedBy: actor.id,
      linkedIncidentId: data.linkedIncidentId,
      linkedAuditId: data.linkedAuditId,
      notes: data.notes,
      status: 'PENDING',
    },
  })

  await logAudit({
    tenantId: data.tenantCatering,
    actorId: actor.id,
    action: 'CREATE',
    entity: 'Penalty',
    entityId: penalty.id,
    diff: {
      before: null,
      after: {
        type: penalty.type,
        amount: penalty.amount.toString(),
        reason: penalty.reason,
      },
    },
  })

  revalidatePath('/admin/quality/penalties')
  return { id: penalty.id }
}

export async function applyPenaltyAction(input: { penaltyId: string }) {
  const actor = await requireSuperAdmin()
  const { penaltyId } = applyPenaltySchema.parse(input)

  const current = await prisma.penalty.findUnique({ where: { id: penaltyId } })
  if (!current) throw new Error('Penalización no encontrada')
  if (current.status !== 'PENDING' && current.status !== 'DISPUTED') {
    throw new Error(
      `No se puede aplicar desde estado ${current.status}. Sólo PENDING o DISPUTED.`
    )
  }

  const updated = await prisma.penalty.update({
    where: { id: penaltyId },
    data: {
      status: 'APPLIED',
      settledAt: new Date(),
      ...(current.status === 'DISPUTED' && {
        resolvedAt: new Date(),
        resolvedBy: actor.id,
      }),
    },
  })

  await logAudit({
    tenantId: current.tenantCatering,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'Penalty',
    entityId: penaltyId,
    diff: {
      before: { status: current.status },
      after: { status: 'APPLIED' },
    },
  })

  revalidatePath('/admin/quality/penalties')
  revalidatePath(`/admin/quality/penalties/${penaltyId}`)
  return { id: updated.id }
}

export async function waivePenaltyAction(input: {
  penaltyId: string
  reason: string
}) {
  const actor = await requireSuperAdmin()
  const { penaltyId, reason } = waivePenaltySchema.parse(input)

  const current = await prisma.penalty.findUnique({ where: { id: penaltyId } })
  if (!current) throw new Error('Penalización no encontrada')
  if (current.status === 'WAIVED') {
    throw new Error('Esta penalización ya está perdonada')
  }

  const updated = await prisma.penalty.update({
    where: { id: penaltyId },
    data: {
      status: 'WAIVED',
      resolvedAt: new Date(),
      resolvedBy: actor.id,
      notes: current.notes
        ? `${current.notes}\n\n[Perdonada] ${reason}`
        : `[Perdonada] ${reason}`,
    },
  })

  await logAudit({
    tenantId: current.tenantCatering,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'Penalty',
    entityId: penaltyId,
    diff: {
      before: { status: current.status },
      after: { status: 'WAIVED', reason },
    },
  })

  revalidatePath('/admin/quality/penalties')
  return { id: updated.id }
}

/**
 * ADMIN_CATERING dispara este Action desde /catering/calidad.
 * Solo valida que está dentro del plazo (DISPUTE_WINDOW_DAYS).
 */
export async function disputePenaltyAction(input: {
  penaltyId: string
  reason: string
}) {
  const { penaltyId, reason } = disputePenaltySchema.parse(input)

  const current = await prisma.penalty.findUnique({ where: { id: penaltyId } })
  if (!current) throw new Error('Penalización no encontrada')

  const actor = await requireCateringAdminOfTenant(current.tenantCatering)

  if (current.status !== 'APPLIED') {
    throw new Error('Solo puedes disputar penalizaciones en estado APPLIED')
  }

  const DISPUTE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
  if (
    current.settledAt &&
    Date.now() - current.settledAt.getTime() > DISPUTE_WINDOW_MS
  ) {
    throw new Error(
      'El plazo de 7 días para disputar ya ha expirado'
    )
  }

  const updated = await prisma.penalty.update({
    where: { id: penaltyId },
    data: {
      status: 'DISPUTED',
      disputedAt: new Date(),
      disputeReason: reason,
    },
  })

  await logAudit({
    tenantId: current.tenantCatering,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'Penalty',
    entityId: penaltyId,
    diff: {
      before: { status: current.status },
      after: { status: 'DISPUTED', disputeReason: reason },
    },
  })

  revalidatePath('/catering/calidad')
  revalidatePath('/admin/quality/penalties')
  return { id: updated.id }
}
