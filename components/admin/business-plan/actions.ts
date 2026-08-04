'use server'

/**
 * Server actions del Business Plan. Gate por permiso business-plan:edit. Solo se
 * persisten inputs (supuestos por escenario); la proyección se recomputa.
 */

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'
import { saveScenarioSchema, actualsSchema } from '@/lib/validations/finance'
import { captureMrrSnapshot } from '@/lib/business-plan/snapshot'

async function requireEdit() {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new DomainError('Sesión requerida', 403)
  if (
    !permittedAction(session.user.permissions, session.user.role, 'business-plan:edit', ['SUPER_ADMIN'])
  ) {
    throw new DomainError('No tienes permiso para editar el modelo financiero', 403)
  }
  return session.user
}

export async function saveScenarioAction(
  input: unknown
): Promise<ActionResult<{ key: string }>> {
  return withAction(async () => {
    const actor = await requireEdit()
    const d = saveScenarioSchema.parse(input)

    const data = {
      name: d.name,
      description: d.description ?? null,
      kind: d.kind,
      startMonth: d.startMonth,
      horizonMonths: d.horizonMonths,
      assumptions: d.assumptions as unknown as Prisma.InputJsonValue,
      updatedBy: actor.id,
    }

    const row = await prisma.financialScenario.upsert({
      where: { key: d.key },
      create: { key: d.key, ...data },
      update: data,
    })

    await logAudit({
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'FinancialScenario',
      entityId: row.id,
      diff: { after: { key: d.key, horizonMonths: d.horizonMonths } },
    })

    revalidatePath('/admin/business-plan')
    return { key: d.key }
  })
}

export async function saveActualsAction(
  input: unknown
): Promise<ActionResult<{ period: string }>> {
  return withAction(async () => {
    const actor = await requireEdit()
    const d = actualsSchema.parse(input)

    const data = {
      cogsHosting: d.cogsHosting ?? null,
      cogsPayments: d.cogsPayments ?? null,
      cogsSupport: d.cogsSupport ?? null,
      opexSales: d.opexSales ?? null,
      opexRnd: d.opexRnd ?? null,
      opexGna: d.opexGna ?? null,
      headcount: d.headcount ?? null,
      notes: d.notes ?? null,
      updatedBy: actor.id,
    }
    const row = await prisma.financialActual.upsert({
      where: { period: d.period },
      create: { period: d.period, ...data },
      update: data,
    })
    await logAudit({ actorId: actor.id, action: 'UPDATE', entity: 'FinancialActual', entityId: row.id, diff: { after: { period: d.period } } })
    revalidatePath('/admin/business-plan')
    return { period: d.period }
  })
}

/** Captura la foto de MRR/empresas/caterings del período dado (o el actual). */
export async function captureMrrSnapshotAction(
  period?: string
): Promise<ActionResult<{ period: string }>> {
  return withAction(async () => {
    const actor = await requireEdit()
    // La captura vive en lib/business-plan/snapshot.ts (compartida con el job
    // diario `mrr-snapshot` de /api/cron).
    const snap = await captureMrrSnapshot(period)
    await logAudit({ actorId: actor.id, action: 'CREATE', entity: 'MrrSnapshot', entityId: snap.id, diff: { after: { period: snap.period, mrr: snap.mrr } } })
    revalidatePath('/admin/business-plan')
    return { period: snap.period }
  })
}
