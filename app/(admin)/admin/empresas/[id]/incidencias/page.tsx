import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { IncidentSeverity, IncidentStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCompanyById } from '@/lib/db/queries/companies'
import { getGlobalIncidents } from '@/lib/db/queries/admin-quality'
import { parsePageParam } from '@/lib/utils/search-params'
import { SEVERITY_META, STATUS_META, incidentTypeLabel } from '@/lib/incidents/constants'

type SP = { severity?: string; status?: string; search?: string; page?: string }

export default async function CompanyIncidentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SP>
}) {
  const { id } = await params
  const sp = await searchParams
  const company = await getCompanyById(id)
  if (!company) notFound()

  const pageNum = parsePageParam(sp.page)
  const { incidents, total, pageSize } = await getGlobalIncidents({
    tenantEmpresa: id,
    severity: (sp.severity as IncidentSeverity) || undefined,
    status: (sp.status as IncidentStatus) || undefined,
    search: sp.search,
    page: pageNum,
    pageSize: 25,
  })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/empresas/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a {company.name}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Incidencias</h1>
        <p className="mt-1 text-sm text-gray-500">
          Incidencias reportadas en <span className="font-medium">{company.name}</span> ·{' '}
          {total} en total
        </p>
      </div>

      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">Búsqueda</label>
            <input
              name="search"
              type="search"
              defaultValue={sp.search ?? ''}
              placeholder="Tipo o descripción"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Severidad</label>
            <select
              name="severity"
              defaultValue={sp.severity ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Estado</label>
            <select
              name="status"
              defaultValue={sp.status ?? ''}
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
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Catering</th>
              <th className="px-4 py-3 text-left">Severidad</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Días abierta</th>
              <th className="px-4 py-3 text-left">Reportada</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/admin/incidents/${i.id}`}
                    className="text-primary hover:underline"
                  >
                    {incidentTypeLabel(i.type)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{i.cateringName}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_META[i.severity].className}`}
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
                    <span className={i.daysOpen > 7 ? 'font-semibold text-red-600' : ''}>
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
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  Esta empresa no tiene incidencias que coincidan con los filtros.
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
                <Link href={{ pathname: `/admin/empresas/${id}/incidencias`, query: { ...sp, page: String(pageNum - 1) } }}>
                  Anterior
                </Link>
              </Button>
            )}
            {pageNum < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={{ pathname: `/admin/empresas/${id}/incidencias`, query: { ...sp, page: String(pageNum + 1) } }}>
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
