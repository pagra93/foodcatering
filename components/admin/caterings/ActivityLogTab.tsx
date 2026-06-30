/**
 * Registro de actividad del catering (datos reales de AuditLog).
 * Recibe filas ya resueltas (usuario descifrado) desde el server.
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Creó',
  UPDATE: 'Modificó',
  DELETE: 'Eliminó',
  IMPERSONATE: 'Impersonó',
  POLICY_CHANGE: 'Cambió política',
  BILLING_RUN: 'Ejecutó facturación',
  INVOICE_GENERATED: 'Generó factura',
  INVOICE_UPDATED: 'Actualizó factura',
  INVOICE_PAID: 'Marcó factura pagada',
  INVOICE_CANCELLED: 'Anuló factura',
  ORDER_DELIVERED: 'Entregó pedido',
  INCIDENT_REPORTED: 'Reportó incidencia',
  ROUTE_STARTED: 'Inició ruta',
  ROUTE_COMPLETED: 'Completó ruta',
  ROUTE_CANCELLED: 'Canceló ruta',
}

export type ActivityRow = {
  id: string
  timestamp: Date
  user: string
  action: string
  entity: string
  entityId: string
  ip: string | null
}

type Props = {
  logs: ActivityRow[]
}

export function ActivityLogTab({ logs }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Registro de actividad</h3>
        <p className="mt-1 text-sm text-gray-500">
          Acciones registradas sobre este catering (auditoría, últimas 50).
        </p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Acción</th>
              <th className="px-4 py-3 text-left">Entidad</th>
              <th className="px-4 py-3 text-left">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500">
                  {format(l.timestamp, 'dd MMM yyyy HH:mm', { locale: es })}
                </td>
                <td className="px-4 py-3 text-gray-900">{l.user}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{ACTION_LABEL[l.action] ?? l.action}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {l.entity}
                  <span className="ml-1 font-mono text-xs text-gray-400">
                    {l.entityId.slice(-8)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{l.ip ?? '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">
                  No hay actividad registrada para este catering todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
