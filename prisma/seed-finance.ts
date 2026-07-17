/**
 * Seed del modelo financiero: 3 escenarios de sistema (base/optimista/pesimista).
 * Idempotente (upsert por key). Ejecutar: pnpm tsx prisma/seed-finance.ts
 */

import { PrismaClient } from '@prisma/client'
import {
  DEFAULT_ASSUMPTIONS,
  optimisticAssumptions,
  pessimisticAssumptions,
} from '../lib/finance/defaults'

const prisma = new PrismaClient()

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function main() {
  const startMonth = currentMonth()
  const scenarios = [
    { key: 'base', name: 'Base', kind: 'BASE' as const, isDefault: true, assumptions: DEFAULT_ASSUMPTIONS },
    { key: 'optimistic', name: 'Optimista', kind: 'OPTIMISTIC' as const, isDefault: false, assumptions: optimisticAssumptions() },
    { key: 'pessimistic', name: 'Pesimista', kind: 'PESSIMISTIC' as const, isDefault: false, assumptions: pessimisticAssumptions() },
  ]

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
  console.log('✅ Seed financiero completado')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed financiero:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
