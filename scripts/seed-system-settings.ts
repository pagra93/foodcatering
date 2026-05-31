/**
 * Seed idempotente del singleton SystemSettings con defaults.
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.systemSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      defaultPrimaryColor: '#E0492A',
      brandName: 'Plati',
    },
  })
  console.log('✓ SystemSettings singleton listo')
}
main().finally(() => prisma.$disconnect())
