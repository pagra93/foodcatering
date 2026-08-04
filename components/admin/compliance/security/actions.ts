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
  createSecurityReportSchema,
  upsertSecurityCheckSchema,
  type CreateSecurityReportInput,
} from '@/lib/validations/compliance'

async function requireSuperAdmin(permission: string) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new DomainError('Sesión requerida', 403)
  if (!permittedAction(session.user.permissions, session.user.role, permission, ['SUPER_ADMIN'])) {
    throw new DomainError('No tienes permiso para esta acción', 403)
  }
  return session.user
}

export async function upsertSecurityCheckAction(
  input: Parameters<typeof upsertSecurityCheckSchema.parse>[0]
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('security:run-test')
    const data = upsertSecurityCheckSchema.parse(input)

    const check = data.id
      ? await prisma.securityCheck.update({
          where: { id: data.id },
          data: {
            category: data.category,
            item: data.item,
            status: data.status,
            evidence: data.evidence,
            verifiedBy: data.status !== 'PENDING' ? actor.id : null,
            verifiedAt: data.status !== 'PENDING' ? new Date() : null,
          },
        })
      : await prisma.securityCheck.create({
          data: {
            category: data.category,
            item: data.item,
            status: data.status,
            evidence: data.evidence,
            verifiedBy: data.status !== 'PENDING' ? actor.id : null,
            verifiedAt: data.status !== 'PENDING' ? new Date() : null,
          },
        })

    await logAudit({
      actorId: actor.id,
      action: data.id ? 'UPDATE' : 'CREATE',
      entity: 'SecurityCheck',
      entityId: check.id,
      diff: {
        before: null,
        after: { category: data.category, status: data.status },
      },
    })

    revalidatePath('/admin/compliance/security')
    return { id: check.id }
  })
}

export async function createSecurityReportAction(
  input: CreateSecurityReportInput
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('security:run-test')
    const data = createSecurityReportSchema.parse(input)

    const report = await prisma.securityReport.create({
      data: {
        title: data.title,
        scanner: data.scanner,
        scannedAt: data.scannedAt,
        pdfUrl: data.pdfUrl,
        severity: data.severity,
        notes: data.notes,
        uploadedBy: actor.id,
      },
    })

    await logAudit({
      actorId: actor.id,
      action: 'CREATE',
      entity: 'SecurityReport',
      entityId: report.id,
      diff: { before: null, after: { title: data.title, severity: data.severity } },
    })

    revalidatePath('/admin/compliance/security')
    return { id: report.id }
  })
}
