import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AuditAction } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAuditLog, getAuditEntities } from '@/lib/db/queries/admin-audit'

const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Alta',
  UPDATE: 'Modificación',
  DELETE: 'Borrado',
  IMPERSONATE: 'Impersonación',
  POLICY_CHANGE: 'Cambio de política',
  BILLING_RUN: 'Generación de facturación',
  INVOICE_GENERATED: 'Factura generada',
  INVOICE_UPDATED: 'Factura modificada',
  INVOICE_PAID: 'Factura pagada',
  INVOICE_CANCELLED: 'Factura cancelada',
  ORDER_DELIVERED: 'Pedido entregado',
  INCIDENT_REPORTED: 'Incidencia reportada',
  ROUTE_STARTED: 'Ruta iniciada',
  ROUTE_COMPLETED: 'Ruta completada',
  ROUTE_CANCELLED: 'Ruta cancelada',
}

const ACTIONS = Object.keys(ACTION_LABEL)

type SP = { action?: string; entity?: string; entityId?: string; page?: string }

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const params = await searchParams
  const pageNum = Number(params.page ?? '1')

  const [{ rows, total, pageSize }, entities] = await Promise.all([
    getAuditLog({
      action: (params.action as AuditAction) || undefined,
      entity: params.entity || undefined,
      entityId: params.entityId || undefined,
      page: pageNum,
      pageSize: 30,
    }),
    getAuditEntities(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/compliance">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Compliance
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Traza de auditoría</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Registro inmutable de las acciones sensibles del sistema (facturación,
          compliance, impersonación…). Cada línea lleva un hash SHA-256
          tamper-evident: quién hizo qué, sobre qué entidad y cuándo.
        </p>
      </div>

      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Acción</label>
            <select
              name="action"
              title="Filtrar por acción"
              defaultValue={params.action ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABEL[a]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Entidad</label>
            <select
              name="entity"
              title="Filtrar por entidad"
              defaultValue={params.entity ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {entities.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">ID de entidad</label>
            <input
              type="text"
              name="entityId"
              defaultValue={params.entityId ?? ''}
              placeholder="contiene…"
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <Button type="submit" variant="outline">
            Aplicar
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Actor</th>
                <th className="px-4 py-3 text-left">Acción</th>
                <th className="px-4 py-3 text-left">Entidad</th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Tenant</th>
                <th className="px-4 py-3 text-left">Hash</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {format(r.timestamp, 'dd MMM yyyy HH:mm', { locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.actorName}</div>
                    {r.actorEmail && (
                      <div className="text-[10px] text-gray-500">{r.actorEmail}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">
                      {ACTION_LABEL[r.action] ?? r.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">{r.entity}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-500">{r.entityId}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.tenantName}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{r.hashShort}…</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                    No hay registros con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Página {pageNum} de {totalPages} · {total} registros
          </p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={{ pathname: '/admin/compliance/audit-log', query: { ...params, page: String(pageNum - 1) } }}>
                  Anterior
                </Link>
              </Button>
            )}
            {pageNum < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={{ pathname: '/admin/compliance/audit-log', query: { ...params, page: String(pageNum + 1) } }}>
                  Siguiente
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
