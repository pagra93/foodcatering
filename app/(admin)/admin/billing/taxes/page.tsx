import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAllTaxRules } from '@/lib/db/queries/admin-plans-taxes'

export default async function TaxesPage() {
  const rules = await getAllTaxRules()

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
          su `taxRate`.
        </p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-right">Tasa</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-left">Región</th>
              <th className="px-4 py-3 text-left">Vigente desde</th>
              <th className="px-4 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {Number(r.rate).toFixed(2)}%
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px]">
                    {r.category}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {r.region ?? 'Nacional'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {format(r.validFrom, 'dd MMM yyyy', { locale: es })}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={r.active ? 'default' : 'secondary'}>
                    {r.active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="bg-gray-50/60 p-4 text-xs text-gray-600">
        <p>
          Formulario de edición inline en próxima iteración. Por ahora, los
          valores por defecto cubren los casos más comunes en España.
        </p>
      </Card>
    </div>
  )
}
