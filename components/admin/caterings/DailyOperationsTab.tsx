/**
 * Operación diaria del catering (datos reales).
 * Menús publicados (entrantes/primeros/postres) y pedidos por día de la semana.
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '@/components/ui/card'

export type DailyOperationRow = {
  date: Date
  starters: number
  mains: number
  desserts: number
  totalOrders: number
}

type Props = {
  days: DailyOperationRow[]
  cutoffTime?: string | null
  deliveryWindow?: string | null
}

export function DailyOperationsTab({ days, cutoffTime, deliveryWindow }: Props) {
  const totalWeekOrders = days.reduce((s, d) => s + d.totalOrders, 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pedidos esta semana</p>
          <p className="mt-1 text-2xl font-bold">{totalWeekOrders}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Hora de cutoff</p>
          <p className="mt-1 text-2xl font-bold">{cutoffTime ?? '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Ventana de entrega</p>
          <p className="mt-1 text-2xl font-bold">{deliveryWindow ?? '—'}</p>
        </Card>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Menú y pedidos por día (semana en curso)
        </h3>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Día</th>
                <th className="px-4 py-3 text-right">Entrantes</th>
                <th className="px-4 py-3 text-right">Primeros</th>
                <th className="px-4 py-3 text-right">Postres</th>
                <th className="px-4 py-3 text-right">Pedidos</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const published = d.starters + d.mains + d.desserts
                return (
                  <tr key={d.date.toISOString()} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 capitalize text-gray-900">
                      {format(d.date, "EEEE d MMM", { locale: es })}
                    </td>
                    {published === 0 ? (
                      <td colSpan={3} className="px-4 py-3 text-center text-xs text-gray-400">
                        Sin menú publicado
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right">{d.starters}</td>
                        <td className="px-4 py-3 text-right">{d.mains}</td>
                        <td className="px-4 py-3 text-right">{d.desserts}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-right font-medium">{d.totalOrders}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
        <p className="mt-2 text-xs text-gray-400">
          Las incidencias del día y la facturación tienen su propia pestaña.
        </p>
      </div>
    </div>
  )
}
