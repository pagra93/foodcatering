'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import {
  createDpaAgreementSchema,
  type CreateDpaInput,
} from '@/lib/validations/compliance'

async function requireSuperAdmin() {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Acción reservada al super admin')
  }
  return session.user
}

export async function createDpaAgreementAction(input: CreateDpaInput) {
  const actor = await requireSuperAdmin()
  const data = createDpaAgreementSchema.parse(input)

  const tenant = await prisma.tenant.findUnique({
    where: { id: data.tenantId },
    select: { id: true, type: true, name: true },
  })
  if (!tenant || tenant.type === 'ROOT') {
    throw new Error('El DPA solo aplica a tenants EMPRESA o CATERING')
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
}
