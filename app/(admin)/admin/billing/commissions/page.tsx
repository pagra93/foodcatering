import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getSettlements } from '@/lib/db/queries/admin-settlements'

export default async function CommissionsPage() {
  // Traemos una pasada grande y agrupamos por catering en memoria
  const { settlements } = await getSettlements({ pageSize: 500 })

  // Agrupar por catering
  const byId = new Map<
    string,
    {
      name: string
      totalCommission: number
      pendingCommission: number
      paidCommission: number
      totalGross: number
      rows: typeof settlements
    }
  >()

  for (const s of settlements) {
    const id = s.tenantCatering
    const entry = byId.get(id) ?? {
      name: s.catering?.name ?? '—',
      totalCommission: 0,
      pendingCommission: 0,
      paidCommission: 0,
      totalGross: 0,
      rows: [] as typeof settlements,
    }
    const amount = Number(s.commissionAmount)
    entry.totalCommission += amount
    entry.totalGross += Number(s.grossAmount)
    if (s.status === 'PAID') entry.paidCommission += amount
    else if (s.status === 'ISSUED' || s.status === 'OVERDUE')
      entry.pendingCommission += amount
    entry.rows.push(s)
    byId.set(id, entry)
  }

  const rows = [...byId.entries()].sort(
    (a, b) => b[1].totalCommission - a[1].totalCommission
  )

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
        <h1 className="text-2xl font-bold">Comisiones</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Vista agregada de comisiones devengadas por catering. Cada fila es
          el histórico completo; las liquidaciones individuales están en{' '}
          <Link
            href="/admin/billing/settlements"
            className="text-blue-600 hover:underline"
          >
            /admin/billing/settlements
          </Link>
          .
        </p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Catering</th>
              <th className="px-4 py-3 text-right">Facturado total</th>
              <th className="px-4 py-3 text-right">Comisión total</th>
              <th className="px-4 py-3 text-right">Cobrado</th>
              <th className="px-4 py-3 text-right">Pendiente</th>
              <th className="px-4 py-3 text-center">Liquidaciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([id, entry]) => (
              <tr key={id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{entry.name}</td>
                <td className="px-4 py-3 text-right">
                  {entry.totalGross.toFixed(2)} €
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {entry.totalCommission.toFixed(2)} €
                </td>
                <td className="px-4 py-3 text-right text-emerald-600">
                  {entry.paidCommission.toFixed(2)} €
                </td>
                <td
                  className={`px-4 py-3 text-right ${entry.pendingCommission > 0 ? 'text-amber-600' : 'text-gray-400'}`}
                >
                  {entry.pendingCommission.toFixed(2)} €
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="outline" className="text-[10px]">
                    {entry.rows.length}
                  </Badge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  Sin liquidaciones registradas. Genera las del mes pasado con
                  el botón "Generar" en el dashboard.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
