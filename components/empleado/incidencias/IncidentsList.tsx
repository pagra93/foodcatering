'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { SEVERITY_MAP, INCIDENT_STATUS_MAP } from '@/lib/db/queries/empleado-incidencias'
import { incidentDisplayName } from '@/lib/incidents/constants'
import { FileText } from 'lucide-react'
import type { Prisma } from '@prisma/client'

type Incident = {
  id: string
  type: string
  subject?: string | null
  reasonName?: string | null
  typeLabel: string
  typeIcon: string
  severity: string
  severityLabel: string
  status: string
  statusLabel: string
  createdAt: Date
  resolvedAt: Date | null
  resolutionTime: number | null
  resolution: Prisma.JsonValue
  order: {
    id: string
    serviceDate: Date
    selection: Prisma.JsonValue
    price: Prisma.Decimal | number
  } | null
}

type IncidentsListProps = {
  incidents: Incident[]
}

export function IncidentsList({ incidents }: IncidentsListProps) {
  if (incidents.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No tienes incidencias
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Cuando reportes algún problema con tus pedidos, aparecerán aquí
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {incidents.map((incident) => {
        const selection = (incident.order?.selection ?? null) as
          | { first?: { name?: string } | null }
          | null
        const firstDish = selection?.first?.name || 'Sin plato'
        const serviceDate = incident.order?.serviceDate ?? null

        return (
          <Card key={incident.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{incident.typeIcon}</span>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {incidentDisplayName({
                        subject: incident.subject,
                        reasonName: incident.reasonName,
                        type: incident.type,
                      })}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {incident.typeLabel}
                      {' · '}
                      {serviceDate
                        ? `Pedido del ${format(new Date(serviceDate), "d 'de' MMMM", { locale: es })}`
                        : 'Sin pedido asociado'}
                    </p>
                  </div>
                </div>

                {/* Plato */}
                <div className="mb-3 bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Primer plato:</p>
                  <p className="font-medium">{firstDish}</p>
                </div>

                {/* Estado y Severidad */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={INCIDENT_STATUS_MAP[incident.status as keyof typeof INCIDENT_STATUS_MAP]?.color}>
                    {incident.statusLabel}
                  </Badge>
                  <Badge variant="outline" className={SEVERITY_MAP[incident.severity as keyof typeof SEVERITY_MAP]?.color}>
                    Severidad: {incident.severityLabel}
                  </Badge>
                </div>

                {/* Resolución */}
                {incident.resolution && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">
                      ✓ Respuesta del Catering
                    </h4>
                    <p className="text-sm text-green-800">
                      {typeof incident.resolution === 'object' && incident.resolution !== null && !Array.isArray(incident.resolution)
                        ? String((incident.resolution as Record<string, unknown>)['details'] ?? (incident.resolution as Record<string, unknown>)['type'] ?? '')
                        : String(incident.resolution)}
                    </p>
                    {incident.resolvedAt && (
                      <p className="text-xs text-green-600 mt-2">
                        Resuelta el{' '}
                        {format(new Date(incident.resolvedAt), "d 'de' MMMM 'a las' HH:mm", {
                          locale: es,
                        })}
                      </p>
                    )}
                  </div>
                )}

                {/* Seguimiento */}
                <div className="mt-4">
                  <Link
                    href={`/empleado/incidencias/${incident.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Ver seguimiento →
                  </Link>
                </div>
              </div>

              {/* Fecha de creación */}
              <div className="text-right text-sm text-gray-500">
                <p>Reportada</p>
                <p className="font-medium">
                  {format(new Date(incident.createdAt), 'd/MM/yyyy')}
                </p>
                <p className="text-xs">
                  {format(new Date(incident.createdAt), 'HH:mm')}
                </p>
              </div>
            </div>

            {/* Tiempo de resolución */}
            {incident.resolutionTime !== null && (
              <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                Resuelto en {incident.resolutionTime} minutos
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

