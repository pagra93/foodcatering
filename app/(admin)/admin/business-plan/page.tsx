import { getRequiredSession } from '@/lib/auth/session'
import {
  getFinancialScenarios,
  getAnchor,
} from '@/lib/db/queries/admin-business-plan'
import { BusinessPlanWorkspace } from '@/components/admin/business-plan/BusinessPlanWorkspace'

export const dynamic = 'force-dynamic'

export default async function BusinessPlanPage() {
  await getRequiredSession()
  const [scenarios, anchor] = await Promise.all([getFinancialScenarios(), getAnchor()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business Plan</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Modelo financiero de Plati: edita los supuestos y ve al instante la
          proyección de ingresos, costes, rentabilidad, caja y runway. Los
          ingresos y el crecimiento se anclan a tus datos reales; los costes los
          planificas tú.
        </p>
      </div>

      <BusinessPlanWorkspace scenarios={scenarios} anchor={anchor} />
    </div>
  )
}
