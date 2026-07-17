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
import { saveScenarioSchema, actualsSchema } from '@/lib/validations/finance'
import { getBillingDashboardKPIs } from '@/lib/db/queries/admin-billing'

type ActionResult = { ok?: boolean; error?: string; key?: string }

async function requireEdit() {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (
    !permittedAction(session.user.permissions, session.user.role, 'business-plan:edit', ['SUPER_ADMIN'])
  ) {
    throw new Error('No tienes permiso para editar el modelo financiero')
  }
  return session.user
}

export async function saveScenarioAction(input: unknown): Promise<ActionResult> {
  const actor = await requireEdit()
  const parsed = saveScenarioSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

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
  return { ok: true, key: d.key }
}

export async function saveActualsAction(input: unknown): Promise<ActionResult> {
  const actor = await requireEdit()
  const parsed = actualsSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

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
  return { ok: true }
}

/** Captura la foto de MRR/empresas/caterings del período dado (o el actual). */
export async function captureMrrSnapshotAction(period?: string): Promise<ActionResult> {
  const actor = await requireEdit()
  const now = new Date()
  const p = period ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const kpis = await getBillingDashboardKPIs()
  const activeCaterings = await prisma.tenant.count({
    where: { type: 'CATERING', status: 'ACTIVE', deletedAt: null },
  })

  const row = await prisma.mrrSnapshot.upsert({
    where: { period: p },
    create: {
      period: p,
      mrr: kpis.mrrSaas,
      arr: kpis.arrSaas,
      activeCompanies: kpis.activeCompanies,
      activeCaterings,
    },
    update: {
      mrr: kpis.mrrSaas,
      arr: kpis.arrSaas,
      activeCompanies: kpis.activeCompanies,
      activeCaterings,
    },
  })
  await logAudit({ actorId: actor.id, action: 'CREATE', entity: 'MrrSnapshot', entityId: row.id, diff: { after: { period: p, mrr: kpis.mrrSaas } } })
  revalidatePath('/admin/business-plan')
  return { ok: true }
}
