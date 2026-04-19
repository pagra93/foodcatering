import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getActiveMaintenanceWindow,
  getMaintenanceHistory,
  getUpcomingMaintenanceWindows,
} from '@/lib/db/queries/admin-operations'
import { ScheduleForm } from '@/components/admin/operations/maintenance/ScheduleForm'
import { CancelMaintenanceButton } from '@/components/admin/operations/maintenance/CancelButton'

export default async function MaintenancePage() {
  const [active, upcoming, history] = await Promise.all([
    getActiveMaintenanceWindow(),
    getUpcomingMaintenanceWindows(),
    getMaintenanceHistory(30),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/operations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Operación
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Modo Mantenimiento</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Programa ventanas durante las cuales la plataforma devuelve 503
          con un mensaje custom a todos los usuarios. SUPER_ADMIN siempre
          pasa (para poder trabajar durante la ventana).
        </p>
      </div>

      {active && (
        <Card className="border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">
                Ventana activa ahora
              </p>
              <p className="mt-1 text-sm text-red-800">
                <strong>{active.reason}</strong> · hasta{' '}
                {format(active.endsAt, "dd MMM yyyy 'a las' HH:mm", { locale: es })}
              </p>
              <p className="mt-2 rounded-md bg-white p-3 text-sm italic text-gray-700">
                "{active.message}"
              </p>
              <div className="mt-3">
                <CancelMaintenanceButton id={active.id} />
              </div>
            </div>
          </div>
        </Card>
      )}

      <ScheduleForm />

      <Card className="p-5">
        <h3 className="mb-3 text-base font-semibold">Ventanas próximas</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500">Sin ventanas programadas.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((w) => (
              <li
                key={w.id}
                className="flex items-start justify-between gap-3 rounded-md border border-gray-100 p-3"
              >
                <div className="flex-1 text-sm">
                  <p className="font-medium">{w.reason}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {format(w.startsAt, 'dd MMM HH:mm', { locale: es })} →{' '}
                    {format(w.endsAt, 'dd MMM HH:mm', { locale: es })}
                  </p>
                  <p className="mt-1 text-xs italic text-gray-600">
                    "{w.message}"
                  </p>
                </div>
                <CancelMaintenanceButton id={w.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-base font-semibold">Histórico</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay ventanas en el histórico.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Motivo</th>
                <th className="px-3 py-2 text-left">Período</th>
                <th className="px-3 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {history.map((w) => {
                const now = new Date()
                const active =
                  !w.disabledAt && w.startsAt <= now && w.endsAt >= now
                const cancelled = !!w.disabledAt
                const past = !cancelled && !active && w.endsAt < now
                return (
                  <tr key={w.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{w.reason}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {format(w.startsAt, 'dd MMM HH:mm', { locale: es })} →{' '}
                      {format(w.endsAt, 'dd MMM HH:mm', { locale: es })}
                    </td>
                    <td className="px-3 py-2">
                      {active && <Badge variant="destructive">Activa</Badge>}
                      {cancelled && <Badge variant="secondary">Cancelada</Badge>}
                      {past && <Badge variant="outline">Finalizada</Badge>}
                      {!active && !cancelled && !past && (
                        <Badge variant="outline">Programada</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
