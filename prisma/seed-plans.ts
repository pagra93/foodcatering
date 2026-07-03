/**
 * Seed de planes SaaS de sistema (idempotente).
 * - Upsert de los planes de SYSTEM_PLANS (lib/plans/feature-catalog.ts) con sus
 *   límites, precios y features (tabla PlanFeature).
 * - Backfill de Company.saasPlanId desde el enum legacy Company.plan (match por code).
 *
 * Ejecutar: pnpm tsx prisma/seed-plans.ts
 */

import { PrismaClient } from '@prisma/client'
import { SYSTEM_PLANS, resolvePlanFeatureKeys } from '../lib/plans/feature-catalog'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Sembrando planes SaaS de sistema…')

  for (const def of SYSTEM_PLANS) {
    const data = {
      name: def.name,
      description: def.description,
      scope: 'SYSTEM' as const,
      tenantEmpresa: null,
      monthlyPrice: def.monthlyPrice,
      yearlyPrice: def.yearlyPrice,
      maxEmployees: def.limits.maxEmployees,
      maxSites: def.limits.maxSites,
      maxCaterings: def.limits.maxCaterings,
      maxOrdersMonth: def.limits.maxOrdersMonth,
      supportLevel: def.supportLevel,
      active: true,
    }
    const plan = await prisma.saasPlan.upsert({
      where: { code: def.code },
      create: { code: def.code, ...data },
      update: data,
    })

    // Features: reset exacto al catálogo del plan (core se añaden en runtime).
    const keys = resolvePlanFeatureKeys(def.features)
    await prisma.planFeature.deleteMany({ where: { planId: plan.id } })
    if (keys.length > 0) {
      await prisma.planFeature.createMany({
        data: keys.map((featureKey) => ({ planId: plan.id, featureKey })),
        skipDuplicates: true,
      })
    }
    console.log(`  · ${def.code}: ${keys.length} features, ${def.monthlyPrice} €/mes`)
  }

  // Backfill de empresas sin saasPlanId (por si alguna quedó suelta).
  const plans = await prisma.saasPlan.findMany({ select: { id: true, code: true } })
  const idByCode = new Map(plans.map((p) => [p.code, p.id]))
  const pending = await prisma.company.findMany({
    where: { saasPlanId: null },
    select: { id: true, plan: true },
  })
  let backfilled = 0
  for (const c of pending) {
    const id = idByCode.get(String(c.plan))
    if (id) {
      await prisma.company.update({ where: { id: c.id }, data: { saasPlanId: id } })
      backfilled++
    }
  }
  console.log(`  · backfill Company.saasPlanId: ${backfilled} empresas`)
  console.log('✅ Planes SaaS sembrados')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
