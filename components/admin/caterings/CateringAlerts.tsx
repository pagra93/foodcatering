/**
 * Componente de Alertas Críticas para un catering
 * Muestra alertas urgentes que requieren atención inmediata
 */

'use client'

import { AlertTriangle, FileWarning, TrendingDown, Activity } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type AlertsData = {
  expiredDocs: Array<{
    id: string
    type: string
    expiresAt: Date
    status: string
  }>
  criticalIncidents: Array<{
    id: string
    severity: string
    description: string
  }>
  lowPunctuality: boolean
  highIncidentRate: boolean
  capacityNearLimit: boolean
}

type CateringAlertsProps = {
  alerts: AlertsData
}

export function CateringAlerts({ alerts }: CateringAlertsProps) {
  const hasAlerts =
    alerts.expiredDocs.length > 0 ||
    alerts.criticalIncidents.length > 0 ||
    alerts.lowPunctuality ||
    alerts.highIncidentRate ||
    alerts.capacityNearLimit

  if (!hasAlerts) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Alertas Críticas
        </h2>
        <Badge variant="destructive">
          {alerts.expiredDocs.length +
            alerts.criticalIncidents.length +
            (alerts.lowPunctuality ? 1 : 0) +
            (alerts.highIncidentRate ? 1 : 0) +
            (alerts.capacityNearLimit ? 1 : 0)}{' '}
          alertas
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Documentos Caducados o Por Caducar */}
        {alerts.expiredDocs.length > 0 && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <FileWarning className="h-5 w-5 !text-red-600" />
            <AlertTitle className="text-red-900">
              Documentos Críticos ({alerts.expiredDocs.length})
            </AlertTitle>
            <AlertDescription className="text-red-800">
              <ul className="mt-2 space-y-1 text-sm">
                {alerts.expiredDocs.slice(0, 3).map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between">
                    <span>
                      {doc.type === 'SANITARY_REGISTRATION' && 'Registro Sanitario'}
                      {doc.type === 'LIABILITY_INSURANCE' && 'Seguro RC'}
                      {doc.type === 'FOOD_HANDLER_CERTIFICATE' && 'Certificado Manipulador'}
                      {doc.type === 'APPCC_CERTIFICATE' && 'APPCC'}
                    </span>
                    <Badge variant="outline" className="ml-2 border-red-300 text-red-700">
                      {doc.status === 'EXPIRED' ? 'Caducado' : 'Caduca pronto'}
                    </Badge>
                  </li>
                ))}
              </ul>
              {alerts.expiredDocs.length > 3 && (
                <p className="mt-2 text-xs text-red-700">
                  +{alerts.expiredDocs.length - 3} documentos más
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
              >
                Ver todos los documentos
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Incidencias Críticas */}
        {alerts.criticalIncidents.length > 0 && (
          <Alert variant="destructive" className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-5 w-5 !text-orange-600" />
            <AlertTitle className="text-orange-900">
              Incidencias Críticas Abiertas ({alerts.criticalIncidents.length})
            </AlertTitle>
            <AlertDescription className="text-orange-800">
              <ul className="mt-2 space-y-1 text-sm">
                {alerts.criticalIncidents.slice(0, 2).map((incident) => (
                  <li key={incident.id} className="line-clamp-2">
                    <span className="font-medium">{incident.severity}:</span> {incident.type}
                  </li>
                ))}
              </ul>
              {alerts.criticalIncidents.length > 2 && (
                <p className="mt-2 text-xs text-orange-700">
                  +{alerts.criticalIncidents.length - 2} incidencias más
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                Ver incidencias
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Baja Puntualidad */}
        {alerts.lowPunctuality && (
          <Alert variant="destructive" className="border-yellow-200 bg-yellow-50">
            <TrendingDown className="h-5 w-5 !text-yellow-600" />
            <AlertTitle className="text-yellow-900">
              SLA de Puntualidad por Debajo del 90%
            </AlertTitle>
            <AlertDescription className="text-yellow-800">
              La puntualidad en entregas está por debajo del umbral crítico. Se
              requiere acción inmediata para mejorar los tiempos de entrega.
            </AlertDescription>
          </Alert>
        )}

        {/* Alta Tasa de Incidencias */}
        {alerts.highIncidentRate && (
          <Alert variant="destructive" className="border-yellow-200 bg-yellow-50">
            <Activity className="h-5 w-5 !text-yellow-600" />
            <AlertTitle className="text-yellow-900">
              Tasa de Incidencias Superior al 5%
            </AlertTitle>
            <AlertDescription className="text-yellow-800">
              El porcentaje de pedidos con incidencias está por encima del
              límite aceptable. Revisar procesos de calidad.
            </AlertDescription>
          </Alert>
        )}

        {/* Capacidad Cerca del Límite */}
        {alerts.capacityNearLimit && (
          <Alert variant="destructive" className="border-blue-200 bg-blue-50">
            <Activity className="h-5 w-5 !text-blue-600" />
            <AlertTitle className="text-blue-900">
              Capacidad al 90% o Más
            </AlertTitle>
            <AlertDescription className="text-blue-800">
              La demanda está cerca del límite de capacidad diaria. Considerar
              aumentar capacidad o limitar nuevos pedidos.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

