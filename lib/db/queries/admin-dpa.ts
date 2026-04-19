/**
 * Queries para gestión de Data Processing Agreements (DPA).
 */

import { prisma } from '@/lib/db/prisma'

export type DpaSummary = {
  id: string
  tenantId: string
  tenantName: string
  tenantType: 'EMPRESA' | 'CATERING'
  subdomain: string
  currentVersion: string | null
  signedAt: Date | null
  effectiveTo: Date | null
  pdfUrl: string | null
  daysToExpire: number | null
  status: 'OK' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING'
}

/**
 * Para cada tenant EMPRESA/CATERING devuelve su DPA vigente (si lo hay)
 * más metadatos para detectar tenants sin DPA o con DPA próximo a vencer.
 */
export async function getDpaOverview(): Promise<DpaSummary[]> {
  const now = new Date()

  const tenants = await prisma.tenant.findMany({
    where: {
      type: { in: ['EMPRESA', 'CATERING'] },
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: { id: true, name: true, type: true, subdomain: true },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })

  const agreements = await prisma.dpaAgreement.findMany({
    where: {
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  })

  const currentByTenant = new Map(
    agreements.reduce<Array<[string, (typeof agreements)[number]]>>(
      (acc, a) => {
        if (!acc.find(([k]) => k === a.tenantId)) {
          acc.push([a.tenantId, a])
        }
        return acc
      },
      []
    )
  )

  return tenants.map((t): DpaSummary => {
    const dpa = currentByTenant.get(t.id)
    if (!dpa) {
      return {
        id: '',
        tenantId: t.id,
        tenantName: t.name,
        tenantType: t.type as 'EMPRESA' | 'CATERING',
        subdomain: t.subdomain,
        currentVersion: null,
        signedAt: null,
        effectiveTo: null,
        pdfUrl: null,
        daysToExpire: null,
        status: 'MISSING',
      }
    }
    const daysToExpire = dpa.effectiveTo
      ? Math.ceil(
          (dpa.effectiveTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      : null
    let status: DpaSummary['status'] = 'OK'
    if (daysToExpire !== null) {
      if (daysToExpire < 0) status = 'EXPIRED'
      else if (daysToExpire <= 30) status = 'EXPIRING_SOON'
    }
    return {
      id: dpa.id,
      tenantId: t.id,
      tenantName: t.name,
      tenantType: t.type as 'EMPRESA' | 'CATERING',
      subdomain: t.subdomain,
      currentVersion: dpa.version,
      signedAt: dpa.signedAt,
      effectiveTo: dpa.effectiveTo,
      pdfUrl: dpa.pdfUrl,
      daysToExpire,
      status,
    }
  })
}

/**
 * Histórico completo de DPAs de un tenant (para el drill-down).
 */
export async function getDpaHistoryForTenant(tenantId: string) {
  return prisma.dpaAgreement.findMany({
    where: { tenantId },
    orderBy: { effectiveFrom: 'desc' },
  })
}

/**
 * DPA actualmente vigente para un tenant (usado en empresa/catering portales).
 */
export async function getCurrentDpaForTenant(tenantId: string) {
  const now = new Date()
  return prisma.dpaAgreement.findFirst({
    where: {
      tenantId,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  })
}
