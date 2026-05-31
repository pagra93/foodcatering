import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { getSettlementsForCatering } from '@/lib/db/queries/admin-settlements'
import {
  getCateringBillingKPIs,
  getCateringInvoicesEmitidas,
} from '@/lib/db/queries/catering-billing'
import { CateringBillingTabs } from '@/components/catering/facturacion/CateringBillingTabs'

export default async function CateringFacturacionPage() {
  const session = (await auth()) as Session | null
  if (!session?.user?.tenantId) redirect('/login')
  const tenantId = session.user.tenantId

  const [kpis, invoices, settlements] = await Promise.all([
    getCateringBillingKPIs(tenantId),
    getCateringInvoicesEmitidas(tenantId),
    getSettlementsForCatering(tenantId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Facturación</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Dos vistas: lo que facturas a tus empresas y lo que pagas a
          Plati por la plataforma (comisión sobre facturación mensual).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Facturado YTD</p>
          <p className="mt-1 text-2xl font-bold">
            {kpis.emitidasTotalYTD.toFixed(2)} €
          </p>
          <p className="mt-1 text-xs text-emerald-600">
            {kpis.emitidasPaidYTD.toFixed(2)} € cobrado
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pendiente de cobrar</p>
          <p
            className={`mt-1 text-2xl font-bold ${kpis.pendingCobrarAmount > 0 ? 'text-amber-600' : ''}`}
          >
            {kpis.pendingCobrarAmount.toFixed(2)} €
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {kpis.pendingCobrarCount} facturas
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Comisión Plati YTD</p>
          <p className="mt-1 text-2xl font-bold">
            {kpis.commissionsYTD.toFixed(2)} €
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {kpis.settlementsPaidYTD.toFixed(2)} € pagado
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pendiente Plati</p>
          <p
            className={`mt-1 text-2xl font-bold ${kpis.pendingPagarAmount > 0 ? 'text-red-600' : ''}`}
          >
            {kpis.pendingPagarAmount.toFixed(2)} €
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {kpis.pendingPagarCount} liquidaciones
          </p>
        </Card>
      </div>

      <CateringBillingTabs
        invoices={invoices.map((i) => ({
          id: i.id,
          number: i.number,
          period: i.period,
          total: i.total.toString(),
          status: i.status,
          issueDate: i.issueDate,
          dueDate: i.dueDate,
          empresa: i.empresa,
        }))}
        settlements={settlements.map((s) => ({
          id: s.id,
          period: s.period,
          grossAmount: s.grossAmount.toString(),
          commissionRate: s.commissionRate.toString(),
          commissionAmount: s.commissionAmount.toString(),
          penalties: s.penalties.toString(),
          netOwed: s.netOwed.toString(),
          status: s.status,
          dueBy: s.dueBy,
          paidAt: s.paidAt,
          paymentRef: s.paymentRef,
        }))}
      />
    </div>
  )
}
