import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { IncidentSeverity, IncidentStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getGlobalIncidents,
  getGlobalIncidentsKPIs,
} from '@/lib/db/queries/admin-quality'

const SEVERITY_META: Record<
  IncidentSeverity,
  { label: string; color: string }
> = {
  LOW: { label: 'Baja', color: 'text-gray-600 bg-gray-100 border-gray-200' },
  MEDIUM: {
    label: 'Media',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  HIGH: { label: 'Alta', color: 'text-red-700 bg-red-50 border-red-200' },
}

const STATUS_META: Record<
  IncidentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  OPEN: { label: 'Abierta', variant: 'destructive' },
  IN_PROGRESS: { label: 'En curso', variant: 'outline' },
  RESOLVED: { label: 'Resuelta', variant: 'default' },
  COMPENSATED: { label: 'Compensada', variant: 'secondary' },
}

type SP = {
  severity?: string
  status?: string
  page?: string
  search?: string
}

export default async function GlobalIncidentsPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const params = await searchParams
  const pageNum = Number(params.page ?? '1')

  const [{ incidents, total, pageSize }, kpis] = await Promise.all([
    getGlobalIncidents({
      severity: (params.severity as IncidentSeverity) || undefined,
      status: (params.status as IncidentStatus) || undefined,
      search: params.search,
      page: pageNum,
      pageSize: 25,
    }),
    getGlobalIncidentsKPIs(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/quality">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Calidad
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Incidencias — vista global</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Todas las incidencias reportadas en la plataforma, cross-tenant.
          Úsalo para detectar patrones: si un tipo de incidencia se repite en
          varios caterings, probablemente hay una causa sistémica.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Abiertas</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{kpis.open}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">En curso</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {kpis.inProgress}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Resueltas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {kpis.resolved}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Compensadas</p>
          <p className="mt-1 text-2xl font-bold">{kpis.compensated}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Resolución media</p>
          <p className="mt-1 text-2xl font-bold">
            {kpis.avgResolutionHours}h
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Búsqueda
            </label>
            <input
              name="search"
              type="search"
              defaultValue={params.search ?? ''}
              placeholder="Tipo o descripción"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Severidad
            </label>
            <select
              name="severity"
              defaultValue={params.severity ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
            </select>
          </div>
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
              <option value="OPEN">Abiertas</option>
              <option value="IN_PROGRESS">En curso</option>
              <option value="RESOLVED">Resueltas</option>
              <option value="COMPENSATED">Compensadas</option>
            </select>
          </div>
          <Button type="submit" variant="outline">
            Aplicar
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Catering</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Severidad</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Días abierta</th>
              <th className="px-4 py-3 text-left">Reportada</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{i.empresaName}</td>
                <td className="px-4 py-3">{i.cateringName}</td>
                <td className="px-4 py-3 font-mono text-xs">{i.type}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_META[i.severity].color}`}
                  >
                    {SEVERITY_META[i.severity].label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_META[i.status].variant}>
                    {STATUS_META[i.status].label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right text-xs">
                  {i.status === 'OPEN' || i.status === 'IN_PROGRESS' ? (
                    <span
                      className={
                        i.daysOpen > 7 ? 'font-semibold text-red-600' : ''
                      }
                    >
                      {i.daysOpen}d
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {format(i.createdAt, 'dd MMM yyyy HH:mm', { locale: es })}
                </td>
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay incidencias que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Página {pageNum} de {totalPages} · {total} registros
          </p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: '/admin/quality/incidents',
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
                    pathname: '/admin/quality/incidents',
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
