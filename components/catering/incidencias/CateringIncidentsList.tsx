'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { SEVERITY_MAP, INCIDENT_STATUS_MAP } from '@/lib/db/queries/catering-incidencias'
import { FileText, MessageCircle } from 'lucide-react'
import { ResolveIncidentDialog } from './ResolveIncidentDialog'

type Incident = {
  id: string
  type: string
  typeLabel: string
  typeIcon: string
  severity: string
  severityLabel: string
  status: string
  statusLabel: string
  createdAt: Date
  resolvedAt: Date | null
  resolutionTime: number | null
  resolution: any
  companyName: string
  employeeName: string | null
  employeeEmail: string | null
  order: {
    id: string
    serviceDate: Date
    selection: any
    price: number
  } | null
}

type CateringIncidentsListProps = {
  incidents: Incident[]
}

export function CateringIncidentsList({ incidents }: CateringIncidentsListProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  if (incidents.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No hay incidencias
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            No se encontraron incidencias con los filtros aplicados
          </p>
        </div>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {incidents.map((incident) => {
          const selection = incident.order?.selection as any
          const firstDish = selection?.first?.name || 'Sin información'
          const isOpen = incident.status === 'OPEN' || incident.status === 'IN_PROGRESS'

          return (
            <Card key={incident.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{incident.typeIcon}</span>
                    <div>
                      <h3 className="font-semibold text-lg">{incident.typeLabel}</h3>
                      <p className="text-sm text-gray-500">
                        {incident.companyName} • {incident.employeeName}
                      </p>
                    </div>
                  </div>

                  {/* Pedido */}
                  {incident.order && (
                    <div className="mb-3 bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Pedido del{' '}
                        {format(new Date(incident.order.serviceDate), "d 'de' MMMM", {
                          locale: es,
                        })}
                      </p>
                      <p className="font-medium">{firstDish}</p>
                      <p className="text-sm text-gray-600">
                        Precio: {Number(incident.order.price).toFixed(2)}€
                      </p>
                    </div>
                  )}

                  {/* Estado y Severidad */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      className={
                        INCIDENT_STATUS_MAP[incident.status as keyof typeof INCIDENT_STATUS_MAP]
                          ?.color
                      }
                    >
                      {incident.statusLabel}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        SEVERITY_MAP[incident.severity as keyof typeof SEVERITY_MAP]?.color
                      }
                    >
                      Severidad: {incident.severityLabel}
                    </Badge>
                  </div>

                  {/* Resolución */}
                  {incident.resolution && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">
                        ✓ Resolución Enviada
                      </h4>
                      <p className="text-sm text-green-800">
                        {typeof incident.resolution === 'object'
                          ? incident.resolution.details || incident.resolution.type
                          : incident.resolution}
                      </p>
                      {incident.resolvedAt && (
                        <p className="text-xs text-green-600 mt-2">
                          {format(
                            new Date(incident.resolvedAt),
                            "d 'de' MMMM 'a las' HH:mm",
                            {
                              locale: es,
                            }
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Botón de responder */}
                  {isOpen && (
                    <div className="mt-4">
                      <Button
                        onClick={() => setSelectedIncident(incident)}
                        size="sm"
                        variant="default"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Responder Incidencia
                      </Button>
                    </div>
                  )}
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

      {/* Dialog de resolución */}
      {selectedIncident && (
        <ResolveIncidentDialog
          incident={selectedIncident}
          isOpen={!!selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </>
  )
}

