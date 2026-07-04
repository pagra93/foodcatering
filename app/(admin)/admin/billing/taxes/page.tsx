import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAllTaxRules } from '@/lib/db/queries/admin-plans-taxes'
import { TaxRuleManager } from '@/components/admin/billing/TaxRuleManager'

export default async function TaxesPage() {
  const rules = await getAllTaxRules()
  const serialized = rules.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    rate: Number(r.rate),
    category: r.category,
    region: r.region,
    validFrom: r.validFrom.toISOString().slice(0, 10),
    validTo: r.validTo ? r.validTo.toISOString().slice(0, 10) : null,
    active: r.active,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/billing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Facturación
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Reglas fiscales</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Tipos de IVA aplicables a facturación. La comida tiene IVA
          reducido (10%), los servicios IVA general (21%), Canarias IGIC
          (7%). Cambios aplican a facturas nuevas; las emitidas congelan
          su <code>taxRate</code>.
        </p>
      </div>

      <TaxRuleManager rules={serialized} />
    </div>
  )
}
