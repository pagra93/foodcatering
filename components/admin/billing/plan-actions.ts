'use server'

/**
 * Server actions de planes SaaS dinámicos: crear/editar/borrar planes y sus
 * features. Gate por permiso (plan:create / plan:edit / plan:delete). Audita.
 * Espejo de role-actions.ts (roles ↔ planes, permisos ↔ features).
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequiredSession } from '@/lib/auth/session'
import { permissionsInclude } from '@/lib/auth/permissions'
import { logAudit } from '@/lib/auth/audit'
import { slugify } from '@/lib/validations/catering'
import {
  CORE_FEATURE_KEYS,
  keysForPortal,
  type PlanPortal,
} from '@/lib/plans/feature-catalog'

type ActionResult = { ok?: boolean; error?: string; id?: string }

const planSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio'),
  description: z.string().optional(),
  planType: z.enum(['EMPRESA', 'CATERING']).default('EMPRESA'),
  // Empresa
  monthlyPrice: z.number().min(0).default(0),
  yearlyPrice: z.number().min(0).nullable().optional(),
  maxEmployees: z.number().int().min(0).nullable().optional(),
  maxSites: z.number().int().min(0).nullable().optional(),
  maxCaterings: z.number().int().min(0).nullable().optional(),
  // Catering
  pricingModel: z.enum(['COMMISSION', 'FIXED']).nullable().optional(),
  commissionPct: z.number().min(0).max(1).nullable().optional(),
  flatMonthlyFee: z.number().min(0).nullable().optional(),
  maxCompanies: z.number().int().min(0).nullable().optional(),
  supportLevel: z.enum(['BASIC', 'PRIORITY', 'DEDICATED']).default('BASIC'),
  active: z.boolean().default(true),
  /** Tenant al que se ata un plan a medida (privado). Vacío = catálogo. */
  tenantEmpresa: z.string().nullable().optional(),
  featureKeys: z.array(z.string()).default([]),
})

const core = new Set(CORE_FEATURE_KEYS)
/** Solo features válidas del portal del plan y no-core (las core son implícitas). */
const cleanFeatureKeys = (keys: string[], portal: PlanPortal) => {
  const valid = new Set(keysForPortal(portal))
  return [...new Set(keys)].filter((k) => valid.has(k) && !core.has(k))
}

/** Campos del plan según su tipo (EMPRESA vs CATERING). */
function planFields(d: z.infer<typeof planSchema>) {
  if (d.planType === 'CATERING') {
    const model = d.pricingModel ?? 'COMMISSION'
    return {
      planType: 'CATERING' as const,
      monthlyPrice: 0,
      yearlyPrice: null,
      maxEmployees: null,
      maxSites: null,
      maxCaterings: null,
      pricingModel: model,
      commissionPct: model === 'COMMISSION' ? d.commissionPct ?? 0 : null,
      flatMonthlyFee: model === 'FIXED' ? d.flatMonthlyFee ?? 0 : null,
      maxCompanies: d.maxCompanies ?? null,
      supportLevel: d.supportLevel,
      active: d.active,
    }
  }
  return {
    planType: 'EMPRESA' as const,
    monthlyPrice: d.monthlyPrice,
    yearlyPrice: d.yearlyPrice ?? null,
    maxEmployees: d.maxEmployees ?? null,
    maxSites: d.maxSites ?? null,
    maxCaterings: d.maxCaterings ?? null,
    pricingModel: null,
    commissionPct: null,
    flatMonthlyFee: null,
    maxCompanies: null,
    supportLevel: d.supportLevel,
    active: d.active,
  }
}

async function uniquePlanCode(name: string): Promise<string> {
  const base = slugify(name) || 'plan'
  let code = base
  let n = 1
  while (await prisma.saasPlan.findUnique({ where: { code }, select: { id: true } })) {
    n += 1
    code = `${base}-${n}`
  }
  return code
}

export async function createPlan(input: unknown): Promise<ActionResult> {
  const session = await getRequiredSession()
  if (!permissionsInclude(session.user.permissions, 'plan:create')) {
    return { error: 'No tienes permiso para crear planes.' }
  }
  const parsed = planSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

  const code = await uniquePlanCode(d.name)
  const featureKeys = cleanFeatureKeys(d.featureKeys, d.planType)

  const plan = await prisma.saasPlan.create({
    data: {
      code,
      name: d.name,
      description: d.description || null,
      scope: 'CUSTOM',
      tenantEmpresa: d.tenantEmpresa || null,
      ...planFields(d),
      planFeatures: { create: featureKeys.map((featureKey) => ({ featureKey })) },
    },
  })

  await logAudit({
    tenantId: null,
    actorId: session.user.id,
    action: 'CREATE',
    entity: 'SaasPlan',
    entityId: plan.id,
    diff: { name: d.name, features: featureKeys.length, custom: true },
  })
  revalidatePath('/admin/billing/plans')
  return { ok: true, id: plan.id }
}

export async function updatePlan(planId: string, input: unknown): Promise<ActionResult> {
  const session = await getRequiredSession()
  if (!permissionsInclude(session.user.permissions, 'plan:edit')) {
    return { error: 'No tienes permiso para editar planes.' }
  }
  const plan = await prisma.saasPlan.findUnique({
    where: { id: planId },
    select: { id: true, scope: true, planType: true },
  })
  if (!plan) return { error: 'El plan no existe.' }

  const parsed = planSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data
  // El tipo del plan (EMPRESA/CATERING) no cambia al editar; usa el existente.
  const portal = plan.planType as PlanPortal
  const featureKeys = cleanFeatureKeys(d.featureKeys, portal)

  await prisma.$transaction([
    prisma.planFeature.deleteMany({ where: { planId } }),
    prisma.planFeature.createMany({
      data: featureKeys.map((featureKey) => ({ planId, featureKey })),
      skipDuplicates: true,
    }),
    prisma.saasPlan.update({
      where: { id: planId },
      data: {
        name: d.name,
        description: d.description || null,
        ...planFields({ ...d, planType: portal }),
        // El code y el scope (SYSTEM/CUSTOM) no se cambian al editar.
        ...(plan.scope === 'CUSTOM' ? { tenantEmpresa: d.tenantEmpresa || null } : {}),
      },
    }),
  ])

  await logAudit({
    tenantId: null,
    actorId: session.user.id,
    action: 'UPDATE',
    entity: 'SaasPlan',
    entityId: planId,
    diff: { features: featureKeys.length, scope: plan.scope },
  })
  revalidatePath('/admin/billing/plans')
  revalidatePath(`/admin/billing/plans/${planId}`)
  return { ok: true }
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  const session = await getRequiredSession()
  if (!permissionsInclude(session.user.permissions, 'plan:delete')) {
    return { error: 'No tienes permiso para eliminar planes.' }
  }
  const plan = await prisma.saasPlan.findUnique({
    where: { id: planId },
    select: { scope: true, _count: { select: { companies: true } } },
  })
  if (!plan) return { error: 'El plan no existe.' }
  if (plan.scope === 'SYSTEM') return { error: 'No se puede eliminar un plan de sistema.' }
  if (plan._count.companies > 0) {
    return { error: 'El plan tiene empresas asignadas; cámbialas de plan antes de borrarlo.' }
  }

  await prisma.saasPlan.delete({ where: { id: planId } })
  await logAudit({
    tenantId: null,
    actorId: session.user.id,
    action: 'DELETE',
    entity: 'SaasPlan',
    entityId: planId,
  })
  revalidatePath('/admin/billing/plans')
  return { ok: true }
}
