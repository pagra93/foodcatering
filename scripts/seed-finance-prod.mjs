/**
 * Seed del MODELO FINANCIERO (Business Plan) para PRODUCCIÓN — autocontenido e
 * IDEMPOTENTE. Siembra los 3 escenarios de sistema (base/optimista/pesimista) con
 * los supuestos por defecto anclados a los planes reales.
 *
 * Sin esto, /admin/business-plan sale vacío en prod ("No hay escenarios"): la
 * migración crea la tabla `FinancialScenario` VACÍA y el seed TS (prisma/
 * seed-finance.ts) no corre en el contenedor porque no hay `tsx`.
 *
 * JavaScript puro (solo `@prisma/client`). Lo llama el entrypoint tras
 * `migrate deploy`:  ALLOW_PROD=1 node scripts/seed-finance-prod.mjs
 * En dev:  node --env-file=.env scripts/seed-finance-prod.mjs
 *
 * Upsert por `key`. NO pisa `assumptions` ni `startMonth` si el escenario ya
 * existe (el usuario los edita); solo asegura name/kind. Mantén los supuestos en
 * sync con lib/finance/defaults.ts.
 */

import { PrismaClient } from '@prisma/client'

const clone = (o) => JSON.parse(JSON.stringify(o))

const BASE_ASSUMPTIONS = {
  growth: {
    startingCompanies: 5,
    startingCaterings: 3,
    growthMode: 'absolute',
    newCompaniesPerMonth: 3,
    companyGrowthRatePct: 12,
    monthlyChurnRatePct: 2,
    newCateringsPerMonth: 1,
    cateringChurnRatePct: 1,
    planMix: { starter: 60, growth: 30, enterprise: 10 },
    volumeMode: 'byCompany',
    employeesPerCompany: 40,
    ordersPerEmployeePerMonth: 18,
    menusPerDay: 1000,
    workingDaysPerMonth: 22,
    menusGrowthRatePct: 8,
    avgTicket: 9,
  },
  pricing: {
    planPrices: { starter: 49, growth: 149, enterprise: 499 },
    cateringCommission: { basico: 8, estandar: 5, premium: 3 },
    cateringFixedFee: 299,
    cateringMix: { basico: 20, estandar: 50, premium: 20, fija: 10 },
  },
  costs: {
    cogs: { hostingPerCompany: 4, paymentProcessingPct: 1.4, supportPerCompany: 6 },
    sAndM: { cac: 600, marketingMonthlyBudget: 2000 },
    rAndD: { engineers: 2, avgSalaryPerMonth: 4000 },
    gAndA: { salariesPerMonth: 4000, rentPerMonth: 800, toolsPerMonth: 500, legalPerMonth: 400 },
  },
  cash: { startingCash: 150000, fundingRounds: [] },
}

function optimisticAssumptions() {
  const a = clone(BASE_ASSUMPTIONS)
  a.growth.newCompaniesPerMonth = 5
  a.growth.companyGrowthRatePct = 18
  a.growth.monthlyChurnRatePct = 1
  a.growth.newCateringsPerMonth = 2
  a.pricing.cateringMix = { basico: 35, estandar: 45, premium: 10, fija: 10 }
  a.costs.sAndM.cac = 450
  return a
}

function pessimisticAssumptions() {
  const a = clone(BASE_ASSUMPTIONS)
  a.growth.newCompaniesPerMonth = 1.5
  a.growth.companyGrowthRatePct = 6
  a.growth.monthlyChurnRatePct = 4
  a.growth.newCateringsPerMonth = 0.5
  a.costs.sAndM.cac = 800
  a.costs.sAndM.marketingMonthlyBudget = 1500
  return a
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function main() {
  const url = process.env.DATABASE_URL ?? ''
  const dbName = url.split('/').pop()?.split('?')[0] ?? '(desconocida)'
  if (/prod/i.test(dbName) && process.env.ALLOW_PROD !== '1') {
    console.error(
      `❌ DATABASE_URL apunta a '${dbName}' (parece producción). Aborta.\n` +
        '   Ejecuta con ALLOW_PROD=1 si es intencional.'
    )
    process.exit(1)
  }

  console.log(`🌱 Modelo financiero (prod) en '${dbName}'`)
  const startMonth = currentMonth()
  const scenarios = [
    { key: 'base', name: 'Base', kind: 'BASE', isDefault: true, assumptions: BASE_ASSUMPTIONS },
    { key: 'optimistic', name: 'Optimista', kind: 'OPTIMISTIC', isDefault: false, assumptions: optimisticAssumptions() },
    { key: 'pessimistic', name: 'Pesimista', kind: 'PESSIMISTIC', isDefault: false, assumptions: pessimisticAssumptions() },
  ]

  const prisma = new PrismaClient()
  try {
    for (const s of scenarios) {
      await prisma.financialScenario.upsert({
        where: { key: s.key },
        create: {
          key: s.key,
          name: s.name,
          kind: s.kind,
          isDefault: s.isDefault,
          startMonth,
          horizonMonths: 36,
          assumptions: s.assumptions,
        },
        // No pisar supuestos ni startMonth si ya existe (el usuario los edita).
        update: { name: s.name, kind: s.kind },
      })
      console.log(`  · escenario ${s.key}`)
    }
    console.log('✅ Modelo financiero (prod) completado')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('❌ Error en modelo financiero (prod):', e)
  process.exit(1)
})
