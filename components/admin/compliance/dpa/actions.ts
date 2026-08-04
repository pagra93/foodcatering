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
  createDpaAgreementSchema,
  type CreateDpaInput,
} from '@/lib/validations/compliance'

async function requireSuperAdmin(permission: string) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new DomainError('Sesión requerida', 403)
  if (!permittedAction(session.user.permissions, session.user.role, permission, ['SUPER_ADMIN'])) {
    throw new DomainError('No tienes permiso para esta acción', 403)
  }
  return session.user
}

export async function createDpaAgreementAction(
  input: CreateDpaInput
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('dpa:create')
    const data = createDpaAgreementSchema.parse(input)

    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
      select: { id: true, type: true, name: true },
    })
    if (!tenant || tenant.type === 'ROOT') {
      throw new DomainError('El DPA solo aplica a tenants EMPRESA o CATERING', 400)
    }

    const dpa = await prisma.dpaAgreement.create({
      data: {
        tenantId: data.tenantId,
        version: data.version,
        pdfUrl: data.pdfUrl,
        signedAt: data.signedAt,
        signedByUserId: actor.id, // Quien lo registró (el firmante real es signedByName)
        signedByName: data.signedByName,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
        uploadedByUserId: actor.id,
        notes: data.notes,
      },
    })

    await logAudit({
      tenantId: data.tenantId,
      actorId: actor.id,
      action: 'CREATE',
      entity: 'DpaAgreement',
      entityId: dpa.id,
      diff: {
        before: null,
        after: {
          version: data.version,
          effectiveFrom: data.effectiveFrom,
        },
      },
    })

    revalidatePath('/admin/compliance/dpa')
    revalidatePath('/empresa/configuracion')
    revalidatePath('/catering/configuracion')
    return { id: dpa.id }
  })
}
