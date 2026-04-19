/**
 * Seed idempotente de defaults de facturación: 3 planes SaaS + 4 reglas
 * fiscales. Ejecutable manualmente en cualquier entorno.
 *
 * Uso: npx tsx scripts/seed-billing-defaults.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Planes SaaS
  await prisma.saasPlan.upsert({
    where: { code: 'STARTER' },
    update: {},
    create: {
      code: 'STARTER',
      name: 'Starter',
      description: 'Ideal para empresas hasta 50 empleados',
      monthlyPrice: 49,
      yearlyPrice: 490,
      maxEmployees: 50,
      supportLevel: 'BASIC',
    },
  })

  await prisma.saasPlan.upsert({
    where: { code: 'GROWTH' },
    update: {},
    create: {
      code: 'GROWTH',
      name: 'Growth',
      description: 'Crecimiento continuado hasta 200 empleados',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      maxEmployees: 200,
      supportLevel: 'PRIORITY',
    },
  })

  await prisma.saasPlan.upsert({
    where: { code: 'ENTERPRISE' },
    update: {},
    create: {
      code: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'Sin límite + soporte dedicado',
      monthlyPrice: 399,
      yearlyPrice: 3990,
      maxEmployees: null,
      supportLevel: 'DEDICATED',
    },
  })

  // Reglas fiscales
  const rules = [
    { code: 'IVA_COMIDA', name: 'IVA reducido comida', rate: 10, category: 'food', region: null },
    { code: 'IVA_GENERAL', name: 'IVA general servicios', rate: 21, category: 'service', region: null },
    { code: 'IGIC_CANARIAS', name: 'IGIC Canarias', rate: 7, category: 'food', region: 'ES-CN' },
    { code: 'EXENTO', name: 'Exento', rate: 0, category: 'service', region: null },
  ]
  for (const r of rules) {
    await prisma.taxRule.upsert({
      where: { code: r.code },
      update: {},
      create: { ...r, validFrom: new Date() },
    })
  }

  console.log('✓ 3 planes SaaS + 4 reglas fiscales sembrados')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
