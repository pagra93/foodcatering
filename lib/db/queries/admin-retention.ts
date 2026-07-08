/**
 * Queries para políticas de retención.
 */

// F5: panel admin = lecturas cross-tenant a propósito → cliente sin guard.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
// Las constantes puras viven en lib/retention/constants (aptas para cliente);
// se reexportan para no romper importadores de servidor.
export { RETENTION_ENTITY_LABEL, RETENTION_DEFAULTS } from '@/lib/retention/constants'

export async function getAllRetentionPolicies() {
  return prisma.retentionPolicy.findMany({
    orderBy: { entity: 'asc' },
  })
}
