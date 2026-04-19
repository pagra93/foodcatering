/**
 * CRUD básico sobre Tenant.branding + SystemSettings.
 */

import { prisma } from '@/lib/db/prisma'

export async function getTenantBranding(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      type: true,
      subdomain: true,
      primaryColor: true,
      secondaryColor: true,
      logoUrl: true,
      faviconUrl: true,
    },
  })
}

export async function getSystemSettings() {
  const s = await prisma.systemSettings.findUnique({
    where: { id: 'singleton' },
  })
  if (s) return s
  // Auto-crear si alguien la borró por error.
  return prisma.systemSettings.create({
    data: { id: 'singleton' },
  })
}

export async function getAllTenantsBranding() {
  return prisma.tenant.findMany({
    where: {
      type: { in: ['EMPRESA', 'CATERING'] },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      type: true,
      subdomain: true,
      primaryColor: true,
      secondaryColor: true,
      logoUrl: true,
      faviconUrl: true,
      status: true,
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })
}
