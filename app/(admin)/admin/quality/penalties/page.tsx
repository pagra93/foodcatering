import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { PenaltyStatus, PenaltyType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { prisma } from '@/lib/db/prisma'
import {
  getPenalties,
  getPenaltiesKPIs,
} from '@/lib/db/queries/admin-penalties'
import { incidentTypeLabel } from '@/lib/incidents/constants'
import { parsePageParam } from '@/lib/utils/search-params'
import { PenaltiesTable } from '@/components/admin/quality/penalties/PenaltiesTable'
import { NewPenaltyForm } from '@/components/admin/quality/penalties/NewPenaltyForm'

const AUDIT_TYPE_LABEL: Record<string, string> = {
  SANITARIA: 'Sanitaria',
  OPERATIVA: 'Operativa',
  SATISFACCION: 'Satisfacción',
}

type SP = {
  status?: string
  type?: string
  page?: string
}

export default async function PenaltiesPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const params = await searchParams
  const pageNum = parsePageParam(params.page)

  const [{ penalties, total, pageSize }, kpis, caterings, recentIncidents, recentAudits] =
    await Promise.all([
      getPenalties({
        status: (params.status as PenaltyStatus) || undefined,
        type: (params.type as PenaltyType) || undefined,
        page: pageNum,
        pageSize: 25,
      }),
      getPenaltiesKPIs(),
      prisma.tenant.findMany({
        where: { type: 'CATERING', status: 'ACTIVE', deletedAt: null },
        select: { id: true, name: true, subdomain: true },
        orderBy: { name: 'asc' },
      }),
      // Origen opcional al crear una penalización (últimas incidencias/auditorías).
      prisma.incident.findMany({
        select: { id: true, type: true, tenantCatering: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.restaurantAudit.findMany({
        select: { id: true, auditType: true, tenantCatering: true, auditedAt: true },
        orderBy: { auditedAt: 'desc' },
        take: 200,
      }),
    ])

  const incidentOptions = recentIncidents.map((i) => ({
    id: i.id,
    tenantCatering: i.tenantCatering,
    label: `${incidentTypeLabel(i.type)} · ${format(i.createdAt, 'd MMM yyyy', { locale: es })}`,
  }))
  const auditOptions = recentAudits.map((a) => ({
    id: a.id,
    tenantCatering: a.tenantCatering,
    label: `${AUDIT_TYPE_LABEL[a.auditType] ?? a.auditType} · ${format(a.auditedAt, 'd MMM yyyy', { locale: es })}`,
  }))

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
        <h1 className="text-2xl font-bold">Penalizaciones</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Sanciones económicas al catering por SLA incumplido, documentación
          caducada o decisión manual. Flujo: <strong>PENDING</strong> → aplicar
          o perdonar. Tras <strong>APPLIED</strong>, el catering tiene 7 días
          para disputar.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {kpis.pending}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Aplicadas</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{kpis.applied}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">En disputa</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {kpis.disputed}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Perdonadas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {kpis.waived}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Importe pendiente</p>
          <p className="mt-1 text-2xl font-bold">
            {Number(kpis.totalPendingAmount).toFixed(2)} €
          </p>
        </Card>
      </div>

      {/* Filtros */}
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
              <option value="PENDING">Pendiente</option>
              <option value="APPLIED">Aplicada</option>
              <option value="DISPUTED">En disputa</option>
              <option value="WAIVED">Perdonada</option>
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
              <option value="MANUAL">Manual</option>
              <option value="SLA_BREACH">SLA incumplido</option>
              <option value="DOC_EXPIRED">Docs caducadas</option>
              <option value="INCIDENT_THRESHOLD">Umbral incidencias</option>
            </select>
          </div>
          <Button type="submit" variant="outline">
            Aplicar
          </Button>
        </form>
      </Card>

      <NewPenaltyForm
        caterings={caterings}
        incidents={incidentOptions}
        audits={auditOptions}
      />

      <PenaltiesTable
        rows={penalties.map((p) => ({
          id: p.id,
          type: p.type,
          status: p.status,
          reason: p.reason,
          amount: p.amount.toString(),
          appliedAt: p.appliedAt,
          disputedAt: p.disputedAt,
          disputeReason: p.disputeReason,
          catering: p.catering,
        }))}
      />

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
                    pathname: '/admin/quality/penalties',
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
                    pathname: '/admin/quality/penalties',
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
