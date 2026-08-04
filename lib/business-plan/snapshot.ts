// Cross-tenant (KPIs globales) → cliente sin guard.
import { prismaAdmin } from '@/lib/db/prisma-admin'
import { getBillingDashboardKPIs } from '@/lib/db/queries/admin-billing'

export type MrrSnapshotResult = {
  id: string
  period: string
  mrr: number
  arr: number
  activeCompanies: number
  activeCaterings: number
}

/**
 * Captura (upsert por período) la foto de MRR/ARR/empresas/caterings activos.
 * La invocan el botón de admin (captureMrrSnapshotAction) y el job diario
 * `mrr-snapshot` de /api/cron — con el upsert diario, el valor que queda al
 * cerrar el mes es el del último día, sin depender de que alguien lo pulse.
 */
export async function captureMrrSnapshot(period?: string): Promise<MrrSnapshotResult> {
  const now = new Date()
  const p =
    period ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const kpis = await getBillingDashboardKPIs()
  const activeCaterings = await prismaAdmin.tenant.count({
    where: { type: 'CATERING', status: 'ACTIVE', deletedAt: null },
  })

  const row = await prismaAdmin.mrrSnapshot.upsert({
    where: { period: p },
    create: {
      period: p,
      mrr: kpis.mrrSaas,
      arr: kpis.arrSaas,
      activeCompanies: kpis.activeCompanies,
      activeCaterings,
    },
    update: {
      mrr: kpis.mrrSaas,
      arr: kpis.arrSaas,
      activeCompanies: kpis.activeCompanies,
      activeCaterings,
    },
  })

  return {
    id: row.id,
    period: p,
    mrr: Number(row.mrr),
    arr: Number(row.arr),
    activeCompanies: row.activeCompanies,
    activeCaterings: row.activeCaterings,
  }
}
