/**
 * Garantiza que los 3 planes SaaS de sistema existan (idempotente) y devuelve un
 * mapa code→id para asignar `Company.saasPlanId` en los seeds. No pisa los datos
 * ricos de `seed-plans.ts` (usa update:{}); solo asegura que existan si un seed
 * de empresas se ejecuta antes que `seed-plans`.
 */

import type { PrismaClient } from '@prisma/client'

const SYSTEM = [
  { code: 'starter', name: 'Starter', monthlyPrice: 49, support: 'BASIC' },
  { code: 'growth', name: 'Growth', monthlyPrice: 149, support: 'PRIORITY' },
  { code: 'enterprise', name: 'Enterprise', monthlyPrice: 499, support: 'DEDICATED' },
]

export async function ensureSystemPlans(
  prisma: PrismaClient
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (const p of SYSTEM) {
    const plan = await prisma.saasPlan.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        name: p.name,
        scope: 'SYSTEM',
        monthlyPrice: p.monthlyPrice,
        supportLevel: p.support,
      },
    })
    map.set(p.code, plan.id)
  }
  return map
}
