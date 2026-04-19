import { redirect } from 'next/navigation'
import { format, subDays } from 'date-fns'
import { Activity, ShieldCheck } from 'lucide-react'
import type { Session } from 'next-auth'
import type { AuditAction } from '@prisma/client'
import { auth } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'
import { prisma } from '@/lib/db/prisma'

const ACTION_META: Partial<
  Record<
    AuditAction,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  >
> = {
  CREATE: { label: 'Crear', variant: 'default' },
  UPDATE: { label: 'Editar', variant: 'secondary' },
  DELETE: { label: 'Eliminar', variant: 'destructive' },
  IMPERSONATE: { label: 'Impersonar', variant: 'destructive' },
  POLICY_CHANGE: { label: 'Cambio política', variant: 'secondary' },
  BILLING_RUN: { label: 'Facturación', variant: 'default' },
  INVOICE_GENERATED: { label: 'Factura creada', variant: 'default' },
  INVOICE_UPDATED: { label: 'Factura editada', variant: 'secondary' },
  INVOICE_PAID: { label: 'Factura pagada', variant: 'default' },
  INVOICE_CANCELLED: { label: 'Factura anulada', variant: 'destructive' },
  ORDER_DELIVERED: { label: 'Pedido entregado', variant: 'default' },
  INCIDENT_REPORTED: { label: 'Incidencia', variant: 'destructive' },
  ROUTE_STARTED: { label: 'Ruta iniciada', variant: 'default' },
  ROUTE_COMPLETED: { label: 'Ruta completada', variant: 'outline' },
  ROUTE_CANCELLED: { label: 'Ruta cancelada', variant: 'destructive' },
}

export default async function CateringAuditoriaPage() {
  const session = (await auth()) as Session | null
  if (!session?.user?.tenantId) redirect('/login')
  const tenantId = session.user.tenantId

  const thirtyDaysAgo = subDays(new Date(), 30)

  const [logs, total, byAction, actors] = await Promise.all([
    prisma.auditLog.findMany({
      where: { tenantId, timestamp: { gte: thirtyDaysAgo } },
      orderBy: { timestamp: 'desc' },
      take: 100,
    }),
    prisma.auditLog.count({
      where: { tenantId, timestamp: { gte: thirtyDaysAgo } },
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where: { tenantId, timestamp: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    }),
    prisma.auditLog.findMany({
      where: { tenantId, timestamp: { gte: thirtyDaysAgo } },
      distinct: ['actorId'],
      select: { actorId: true },
      take: 50,
    }),
  ])

  // Resolver nombre/email de los actores en batch.
  const actorIds = Array.from(new Set(actors.map((a) => a.actorId)))
  const actorRows = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, email: true, nameEnc: true, role: true },
  })
  const actorMap = new Map(actorRows.map((u) => [u.id, u]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Registro de actividad</h1>
        <p className="mt-1 text-sm text-gray-500">
          Auditoría inmutable de acciones sobre tu catering durante los
          últimos 30 días. Cada entrada lleva hash SHA-256 de
          tamper-evidence.
        </p>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          Este registro es inmutable por ley (RGPD Art. 32). Se retiene
          durante 2 años según la política de retención del sistema. Los
          eventos aparecen aquí solo si ocurrieron mutaciones tras la
          activación del logging.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Eventos (30 días)
          </p>
          <p className="mt-1 text-2xl font-bold">{total}</p>
        </Card>
        {byAction.slice(0, 3).map((b) => (
          <Card key={b.action} className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {ACTION_META[b.action]?.label ?? b.action}
            </p>
            <p className="mt-1 text-2xl font-bold">{b._count._all}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50 p-4">
          <h3 className="text-base font-semibold">
            Últimos eventos ({logs.length})
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Mostrando los 100 más recientes. Para búsquedas avanzadas, pide
            export al súper admin.
          </p>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Actor</th>
              <th className="px-4 py-3 text-left">Acción</th>
              <th className="px-4 py-3 text-left">Entidad</th>
              <th className="px-4 py-3 text-left">Cambios</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const actor = actorMap.get(log.actorId)
              const meta = ACTION_META[log.action]
              const diff =
                (log.diff as { before?: unknown; after?: unknown } | null) ??
                null
              return (
                <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50 align-top">
                  <td className="px-4 py-3 text-xs">
                    <div>{format(log.timestamp, 'dd/MM/yyyy')}</div>
                    <div className="text-gray-500">
                      {format(log.timestamp, 'HH:mm:ss')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {actor ? (
                      <>
                        <div className="text-sm font-medium">
                          {actor.nameEnc ?? actor.email}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {actor.role}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {log.actorId.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={meta?.variant ?? 'outline'}
                      className="text-[10px]"
                    >
                      {meta?.label ?? log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{log.entity}</div>
                    <div className="font-mono text-[10px] text-gray-500">
                      {log.entityId.slice(0, 8)}…
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    {diff ? (
                      <pre className="overflow-x-auto whitespace-pre-wrap text-[10px] text-gray-700 bg-gray-50 rounded px-2 py-1 max-h-24">
{JSON.stringify(diff.after ?? diff, null, 0).slice(0, 200)}
                      </pre>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-16 text-center text-sm text-gray-500"
                >
                  <Activity className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  Sin actividad registrada en los últimos 30 días.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
