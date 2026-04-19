import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { GdprRequestStatus, GdprRequestType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getGdprKPIs, getGdprRequests } from '@/lib/db/queries/admin-gdpr'
import { GdprRequestsTable } from '@/components/admin/compliance/gdpr/GdprRequestsTable'

type SP = { status?: string; type?: string; page?: string }

export default async function GdprPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const params = await searchParams
  const pageNum = Number(params.page ?? '1')

  const [{ requests, total, pageSize }, kpis] = await Promise.all([
    getGdprRequests({
      status: (params.status as GdprRequestStatus) || undefined,
      type: (params.type as GdprRequestType) || undefined,
      page: pageNum,
      pageSize: 25,
    }),
    getGdprKPIs(),
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
        <h1 className="text-2xl font-bold">Derechos RGPD</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Solicitudes de ejercicio de derechos RGPD. Plazo legal de respuesta:
          30 días. Los dumps de ACCESS/PORTABILITY se descargan al resolver.
          La anonimización (ERASURE) requiere confirmación escribiendo
          "ANONIMIZAR".
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {kpis.pending}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">En curso</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {kpis.inProgress}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Próximas a vencer</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{kpis.nearDue}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Vencidas</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{kpis.overdue}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Resueltas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {kpis.resolved}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Rechazadas</p>
          <p className="mt-1 text-2xl font-bold">{kpis.rejected}</p>
        </Card>
      </div>

      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Estado
            </label>
            <select
              name="status"
              defaultValue={params.status ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendientes</option>
              <option value="IN_PROGRESS">En curso</option>
              <option value="RESOLVED">Resueltas</option>
              <option value="REJECTED">Rechazadas</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Tipo
            </label>
            <select
              name="type"
              defaultValue={params.type ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="ACCESS">Acceso</option>
              <option value="ERASURE">Olvido</option>
              <option value="PORTABILITY">Portabilidad</option>
              <option value="RECTIFICATION">Rectificación</option>
            </select>
          </div>
          <Button type="submit" variant="outline">
            Aplicar
          </Button>
        </form>
      </Card>

      <GdprRequestsTable
        rows={requests.map((r) => ({
          id: r.id,
          type: r.type,
          status: r.status,
          requestedAt: r.requestedAt,
          dueBy: r.dueBy,
          daysLeft: r.daysLeft,
          resolvedAt: r.resolvedAt,
          notes: r.notes,
          rejectionReason: r.rejectionReason,
          deliveryUrl: r.deliveryUrl,
          subject: r.subject,
          requester: r.requester,
          tenant: r.tenant,
        }))}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Página {pageNum} de {totalPages} · {total} solicitudes
          </p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: '/admin/compliance/gdpr',
                    query: { ...params, page: String(pageNum - 1) },
                  }}
                >
                  Anterior
                </Link>
              </Button>
            )}
            {pageNum < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: '/admin/compliance/gdpr',
                    query: { ...params, page: String(pageNum + 1) },
                  }}
                >
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
