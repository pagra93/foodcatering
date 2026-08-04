'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { createNotification, notifyEntityParties } from '@/lib/notifications'
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'
import {
  applyPenaltySchema,
  createPenaltySchema,
  disputePenaltySchema,
  waivePenaltySchema,
  DISPUTE_WINDOW_DAYS,
} from '@/lib/validations/penalty'
import type {
  CreatePenaltyInput,
} from '@/lib/validations/penalty'

async function requireSuperAdmin(permission: string) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new DomainError('Sesión requerida', 403)
  if (!permittedAction(session.user.permissions, session.user.role, permission, ['SUPER_ADMIN'])) {
    throw new DomainError('No tienes permiso para esta acción', 403)
  }
  return session.user
}

async function requireCateringAdminOfTenant(tenantCatering: string) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new DomainError('Sesión requerida', 403)
  if (session.user.role !== 'ADMIN_CATERING' || session.user.tenantId !== tenantCatering) {
    throw new DomainError('Sólo el ADMIN_CATERING del tenant afectado puede disputar', 403)
  }
  return session.user
}

export async function createPenaltyAction(
  input: CreatePenaltyInput
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('penalty:create')
    const data = createPenaltySchema.parse(input)

    // Verificar que el tenantCatering existe y es CATERING.
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantCatering },
      select: { id: true, type: true, name: true },
    })
    if (!tenant) throw new DomainError('Catering no encontrado', 404)
    if (tenant.type !== 'CATERING') {
      throw new DomainError('El tenant indicado no es de tipo CATERING', 400)
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
  })
}

export async function applyPenaltyAction(input: {
  penaltyId: string
}): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('penalty:edit')
    const { penaltyId } = applyPenaltySchema.parse(input)

    const current = await prisma.penalty.findUnique({ where: { id: penaltyId } })
    if (!current) throw new DomainError('Penalización no encontrada', 404)
    if (current.status !== 'PENDING' && current.status !== 'DISPUTED') {
      throw new DomainError(
        `No se puede aplicar desde estado ${current.status}. Sólo PENDING o DISPUTED.`,
        409
      )
    }

    // Transición CONDICIONADA al estado leído: un doble click ya no aplica dos
    // veces (antes generaba 2 notificaciones + 2 entradas de auditoría y pisaba
    // settledAt, moviendo el descuento de mes en el settlement).
    const res = await prisma.penalty.updateMany({
      where: { id: penaltyId, status: current.status },
      data: {
        status: 'APPLIED',
        settledAt: new Date(),
        ...(current.status === 'DISPUTED' && {
          resolvedAt: new Date(),
          resolvedBy: actor.id,
        }),
      },
    })
    if (res.count !== 1) {
      throw new DomainError('La penalización cambió de estado; recarga la página', 409)
    }
    const updated = await prisma.penalty.findUniqueOrThrow({
      where: { id: penaltyId },
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

    await createNotification({
      tenantId: current.tenantCatering,
      type: 'ALERT',
      priority: 'HIGH',
      title: 'Penalización aplicada',
      message: `Se te ha aplicado una penalización de ${Number(current.amount).toFixed(2)}€. Tienes 7 días para disputarla si no procede.`,
      actionUrl: `/catering/calidad/penalizaciones/${penaltyId}`,
    })

    revalidatePath('/admin/quality/penalties')
    revalidatePath(`/admin/quality/penalties/${penaltyId}`)
    return { id: updated.id }
  })
}

export async function waivePenaltyAction(input: {
  penaltyId: string
  reason: string
}): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('penalty:edit')
    const { penaltyId, reason } = waivePenaltySchema.parse(input)

    const current = await prisma.penalty.findUnique({ where: { id: penaltyId } })
    if (!current) throw new DomainError('Penalización no encontrada', 404)
    if (current.status === 'WAIVED') {
      throw new DomainError('Esta penalización ya está perdonada', 409)
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

    await createNotification({
      tenantId: current.tenantCatering,
      type: 'INFO',
      title: 'Penalización perdonada',
      message: 'Una penalización que tenías ha sido perdonada por el equipo Plati.',
      actionUrl: `/catering/calidad/penalizaciones/${penaltyId}`,
    })

    revalidatePath('/admin/quality/penalties')
    return { id: updated.id }
  })
}

/**
 * ADMIN_CATERING dispara este Action desde /catering/calidad.
 * Solo valida que está dentro del plazo (DISPUTE_WINDOW_DAYS).
 */
export async function disputePenaltyAction(input: {
  penaltyId: string
  reason: string
}): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const { penaltyId, reason } = disputePenaltySchema.parse(input)

    const current = await prisma.penalty.findUnique({ where: { id: penaltyId } })
    if (!current) throw new DomainError('Penalización no encontrada', 404)

    const actor = await requireCateringAdminOfTenant(current.tenantCatering)

    if (current.status !== 'APPLIED') {
      throw new DomainError('Solo puedes disputar penalizaciones en estado APPLIED', 409)
    }

    const DISPUTE_WINDOW_MS = DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000
    if (
      current.settledAt &&
      Date.now() - current.settledAt.getTime() > DISPUTE_WINDOW_MS
    ) {
      throw new DomainError(
        `El plazo de ${DISPUTE_WINDOW_DAYS} días para disputar ya ha expirado`,
        409
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

    // Avisa al equipo Plati (ROOT) — se excluye al propio catering autor.
    await notifyEntityParties('PENALTY', penaltyId, {
      excludeTenantId: current.tenantCatering,
      priority: 'HIGH',
      title: 'Penalización disputada',
      message: `Un catering ha disputado una penalización: ${reason.slice(0, 140)}`,
    })

    revalidatePath('/catering/calidad')
    revalidatePath(`/catering/calidad/penalizaciones/${penaltyId}`)
    revalidatePath('/admin/quality/penalties')
    revalidatePath(`/admin/quality/penalties/${penaltyId}`)
    return { id: updated.id }
  })
}
