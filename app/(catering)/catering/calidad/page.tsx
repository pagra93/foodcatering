import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import {
  getAuditsForCatering,
} from '@/lib/db/queries/admin-audits'
import {
  getCateringRecentComments,
  getOwnPenalties,
  getOwnPenaltiesKPIs,
  getSlaByClient,
} from '@/lib/db/queries/catering-calidad'
import {
  getCateringReputationByCompany,
  getCateringReputation,
  getCateringDishTable,
} from '@/lib/db/queries/ratings'
import { CalidadTabs } from '@/components/catering/calidad/CalidadTabs'
import { requireCateringFeature } from '@/lib/plans/guard'

export default async function CateringCalidadPage() {
  const session = (await auth()) as Session | null
  if (!session?.user?.tenantId) redirect('/login')
  const tenantId = session.user.tenantId

  // Gating por plan: Calidad y Reputación es una feature de pago.
  const locked = await requireCateringFeature(tenantId, 'cat-quality')
  if (locked) return locked

  const [
    reputation,
    dishTable,
    comments,
    byCompany,
    audits,
    penalties,
    penaltiesKpis,
    slas,
  ] = await Promise.all([
    getCateringReputation(tenantId),
    getCateringDishTable(tenantId),
    getCateringRecentComments(tenantId, 20),
    getCateringReputationByCompany(tenantId),
    getAuditsForCatering(tenantId),
    getOwnPenalties(tenantId),
    getOwnPenaltiesKPIs(tenantId),
    getSlaByClient(tenantId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calidad</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Salud del catering: ratings que te dan, auditorías externas,
          penalizaciones aplicadas por Plati y cumplimiento de SLAs con
          tus clientes. Todo en un solo sitio.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Rating medio</p>
          <p className="mt-1 text-2xl font-bold">
            {reputation.average ?? '—'}{' '}
            <span className="text-sm font-normal text-gray-500">/ 5</span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Auditorías</p>
          <p className="mt-1 text-2xl font-bold">{audits.length}</p>
          <p className="mt-1 text-xs text-gray-500">
            {audits.filter((a) => a.score < 60).length} con score bajo
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Penalizaciones activas</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {penaltiesKpis.applied + penaltiesKpis.disputed}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {Number(penaltiesKpis.activeSum).toFixed(2)} €
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">SLAs en riesgo</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {slas.filter((s) => !s.overallOk).length}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            de {slas.length} clientes activos
          </p>
        </Card>
      </div>

      <CalidadTabs
        reputation={reputation}
        dishTable={dishTable}
        comments={comments}
        byCompany={byCompany}
        audits={audits}
        penalties={penalties.map((p) => ({
          id: p.id,
          type: p.type,
          status: p.status,
          reason: p.reason,
          amount: p.amount.toString(),
          appliedAt: p.appliedAt,
          settledAt: p.settledAt,
          disputedAt: p.disputedAt,
          disputeReason: p.disputeReason,
          notes: p.notes,
        }))}
        slas={slas.map((s) => ({
          assignmentId: s.assignmentId,
          companyName: s.companyName,
          type: s.type,
          slaPunctuality: s.slaPunctuality,
          slaIncidentRate: s.slaIncidentRate,
          realPunctuality: s.realPunctuality,
          realIncidentRate: s.realIncidentRate,
          totalOrders: s.totalOrders,
          incidents: s.incidents,
          punctualityOk: s.punctualityOk,
          incidentOk: s.incidentOk,
          overallOk: s.overallOk,
        }))}
      />
    </div>
  )
}
