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
    const isCatering = def.planType === 'CATERING'
    const data = {
      name: def.name,
      description: def.description,
      planType: def.planType,
      scope: 'SYSTEM' as const,
      tenantEmpresa: null,
      // Empresa
      monthlyPrice: def.monthlyPrice ?? 0,
      yearlyPrice: def.yearlyPrice ?? null,
      maxEmployees: def.limits?.maxEmployees ?? null,
      maxSites: def.limits?.maxSites ?? null,
      maxCaterings: def.limits?.maxCaterings ?? null,
      maxOrdersMonth: def.limits?.maxOrdersMonth ?? null,
      // Catering
      pricingModel: def.pricing?.model ?? null,
      commissionPct: def.pricing?.commissionPct ?? null,
      flatMonthlyFee: def.pricing?.flatMonthlyFee ?? null,
      maxCompanies: def.maxCompanies ?? null,
      supportLevel: def.supportLevel,
      active: true,
    }
    const plan = await prisma.saasPlan.upsert({
      where: { code: def.code },
      create: { code: def.code, ...data },
      update: data,
    })

    // Features: reset exacto al catálogo del plan (core se añaden en runtime).
    const keys = resolvePlanFeatureKeys(def.features, def.planType)
    await prisma.planFeature.deleteMany({ where: { planId: plan.id } })
    if (keys.length > 0) {
      await prisma.planFeature.createMany({
        data: keys.map((featureKey) => ({ planId: plan.id, featureKey })),
        skipDuplicates: true,
      })
    }
    const priceLabel = isCatering
      ? def.pricing?.model === 'FIXED'
        ? `${def.pricing.flatMonthlyFee} €/mes`
        : `${(def.pricing?.commissionPct ?? 0) * 100}% comisión`
      : `${def.monthlyPrice} €/mes`
    console.log(`  · ${def.code} [${def.planType}]: ${keys.length} features, ${priceLabel}`)
  }

  // Backfill: caterings sin plan → plan de comisión estándar (5%, "cat-estandar").
  const estandar = await prisma.saasPlan.findUnique({
    where: { code: 'cat-estandar' },
    select: { id: true },
  })
  if (estandar) {
    const res = await prisma.restaurant.updateMany({
      where: { saasPlanId: null },
      data: { saasPlanId: estandar.id },
    })
    if (res.count > 0) console.log(`  · backfill Restaurant.saasPlanId: ${res.count} caterings → cat-estandar`)
  }

  // Nota: empresas/caterings reciben su saasPlanId al crearse (seeds + admin).
  const companiesNoPlan = await prisma.company.count({ where: { saasPlanId: null } })
  if (companiesNoPlan > 0) {
    console.log(`  ⚠ ${companiesNoPlan} empresa(s) sin plan — asígnalo desde /admin/empresas.`)
  }
  console.log('✅ Planes SaaS sembrados')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
