/**
 * Tab de Incidencias del catering (datos reales).
 * Recibe las incidencias ya enriquecidas (getGlobalIncidents({ tenantCatering })).
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { IncidentSeverity, IncidentStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SEVERITY_META, STATUS_META, incidentTypeLabel } from '@/lib/incidents/constants'

export type CateringIncident = {
  id: string
  type: string
  severity: IncidentSeverity
  status: IncidentStatus
  empresaName: string
  createdAt: Date
  daysOpen: number
}

type Props = {
  incidents: CateringIncident[]
}

export function IncidentsTab({ incidents }: Props) {
  const [status, setStatus] = useState<string>('all')

  const filtered =
    status === 'all' ? incidents : incidents.filter((i) => i.status === status)

  const kpi = {
    open: incidents.filter((i) => i.status === 'OPEN').length,
    inProgress: incidents.filter((i) => i.status === 'IN_PROGRESS').length,
    resolved: incidents.filter((i) => i.status === 'RESOLVED').length,
    compensated: incidents.filter((i) => i.status === 'COMPENSATED').length,
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Abiertas</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{kpi.open}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">En curso</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{kpi.inProgress}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Resueltas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{kpi.resolved}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Compensadas</p>
          <p className="mt-1 text-2xl font-bold">{kpi.compensated}</p>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Incidencias reportadas contra este catering
        </h3>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="OPEN">Abiertas</SelectItem>
            <SelectItem value="IN_PROGRESS">En curso</SelectItem>
            <SelectItem value="RESOLVED">Resueltas</SelectItem>
            <SelectItem value="COMPENSATED">Compensadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Severidad</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Días abierta</th>
              <th className="px-4 py-3 text-left">Reportada</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/admin/incidents/${i.id}`}
                    className="text-primary hover:underline"
                  >
                    {incidentTypeLabel(i.type)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{i.empresaName}</td>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  Este catering no tiene incidencias{status !== 'all' ? ' con ese estado' : ''}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
