/**
 * Queries del Business Plan / modelo financiero (super admin). Solo lee inputs
 * (escenarios, costes reales, snapshots). La proyección/métricas se recomputan
 * en el motor puro lib/finance/*.
 */

// Panel super-admin: lecturas globales a propósito → cliente sin guard de tenant.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
import { assumptionsSchema, type Assumptions } from '@/lib/validations/finance'
import { DEFAULT_ASSUMPTIONS } from '@/lib/finance/defaults'

export type ScenarioRow = {
  id: string
  key: string
  name: string
  description: string | null
  kind: 'BASE' | 'OPTIMISTIC' | 'PESSIMISTIC' | 'CUSTOM'
  isDefault: boolean
  startMonth: string
  horizonMonths: number
  assumptions: Assumptions
}

/** Parseo tolerante: si el JSON guardado es viejo/incompleto, cae a defaults. */
function parseAssumptions(raw: unknown): Assumptions {
  const res = assumptionsSchema.safeParse(raw)
  return res.success ? res.data : DEFAULT_ASSUMPTIONS
}

export async function getFinancialScenarios(): Promise<ScenarioRow[]> {
  const rows = await prisma.financialScenario.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    kind: r.kind,
    isDefault: r.isDefault,
    startMonth: r.startMonth,
    horizonMonths: r.horizonMonths,
    assumptions: parseAssumptions(r.assumptions),
  }))
}

/** Ancla real del mes 0: empresas y caterings activos ahora. */
export async function getAnchor(): Promise<{ companies: number; caterings: number }> {
  const [companies, caterings] = await Promise.all([
    prisma.company.count({ where: { tenant: { status: 'ACTIVE', deletedAt: null } } }),
    prisma.tenant.count({ where: { type: 'CATERING', status: 'ACTIVE', deletedAt: null } }),
  ])
  return { companies, caterings }
}

export async function getFinancialScenario(key: string): Promise<ScenarioRow | null> {
  const r = await prisma.financialScenario.findUnique({ where: { key } })
  if (!r) return null
  return {
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    kind: r.kind,
    isDefault: r.isDefault,
    startMonth: r.startMonth,
    horizonMonths: r.horizonMonths,
    assumptions: parseAssumptions(r.assumptions),
  }
}
