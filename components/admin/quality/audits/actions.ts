'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import {
  createAuditSchema,
  updateAuditSchema,
  type CreateAuditInput,
} from '@/lib/validations/audit'

async function requireSuperAdmin(permission: string) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (!permittedAction(session.user.permissions, session.user.role, permission, ['SUPER_ADMIN'])) {
    throw new Error('No tienes permiso para esta acción')
  }
  return session.user
}

export async function createAuditAction(input: CreateAuditInput) {
  const actor = await requireSuperAdmin('audit:create')
  const data = createAuditSchema.parse(input)

  const tenant = await prisma.tenant.findUnique({
    where: { id: data.tenantCatering },
    select: { id: true, type: true },
  })
  if (!tenant || tenant.type !== 'CATERING') {
    throw new Error('Catering no válido')
  }

  const audit = await prisma.restaurantAudit.create({
    data: {
      tenantCatering: data.tenantCatering,
      auditType: data.auditType,
      score: data.score,
      reportUrl: data.reportUrl,
      auditedAt: data.auditedAt,
      auditedBy: actor.id,
      notes: data.notes,
    },
  })

  await logAudit({
    tenantId: data.tenantCatering,
    actorId: actor.id,
    action: 'CREATE',
    entity: 'RestaurantAudit',
    entityId: audit.id,
    diff: {
      before: null,
      after: { type: data.auditType, score: data.score },
    },
  })

  revalidatePath('/admin/quality/audits')
  return { id: audit.id }
}

export async function updateAuditAction(
  input: { auditId: string } & Partial<CreateAuditInput>
) {
  const actor = await requireSuperAdmin('audit:edit')
  const data = updateAuditSchema.parse(input)

  const current = await prisma.restaurantAudit.findUnique({
    where: { id: data.auditId },
  })
  if (!current) throw new Error('Auditoría no encontrada')

  const updated = await prisma.restaurantAudit.update({
    where: { id: data.auditId },
    data: {
      ...(data.auditType && { auditType: data.auditType }),
      ...(data.score !== undefined && { score: data.score }),
      ...(data.reportUrl !== undefined && { reportUrl: data.reportUrl }),
      ...(data.auditedAt && { auditedAt: data.auditedAt }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  })

  await logAudit({
    tenantId: current.tenantCatering,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'RestaurantAudit',
    entityId: updated.id,
    diff: {
      before: { score: current.score, type: current.auditType },
      after: { score: updated.score, type: updated.auditType },
    },
  })

  revalidatePath('/admin/quality/audits')
  return { id: updated.id }
}
