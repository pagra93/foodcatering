/**
 * Prisma Client Singleton
 * Evita múltiples instancias en desarrollo (hot reload)
 */

import { PrismaClient } from '@prisma/client'
import { env } from '@/lib/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Helper para desconectar en tests
 */
export async function disconnect() {
  await prisma.$disconnect()
}

