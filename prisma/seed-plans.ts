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

  // Nota: las empresas reciben su saasPlanId al crearse (seeds + admin). Ya no se
  // hace backfill desde el enum legacy (retirado).
  const withoutPlan = await prisma.company.count({ where: { saasPlanId: null } })
  if (withoutPlan > 0) {
    console.log(`  ⚠ ${withoutPlan} empresa(s) sin plan — asígnalo desde /admin/empresas.`)
  }
  console.log('✅ Planes SaaS sembrados')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
