'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type EmployeeIncidentsProps = {
  incidents: Array<{
    id: string
    type: string
    severity: string
    status: string
    createdAt: Date
  }>
}

const severityMap = {
  LOW: { label: 'Baja', variant: 'outline' as const, color: 'text-gray-600' },
  MEDIUM: { label: 'Media', variant: 'default' as const, color: 'text-yellow-600' },
  HIGH: { label: 'Alta', variant: 'warning' as const, color: 'text-orange-600' },
  CRITICAL: { label: 'Crítica', variant: 'destructive' as const, color: 'text-red-600' },
}

const statusMap = {
  OPEN: { label: 'Abierta', variant: 'destructive' as const },
  IN_PROGRESS: { label: 'En progreso', variant: 'warning' as const },
  RESOLVED: { label: 'Resuelta', variant: 'success' as const },
  CLOSED: { label: 'Cerrada', variant: 'outline' as const },
}

export function EmployeeIncidents({ incidents }: EmployeeIncidentsProps) {
  if (incidents.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-gray-500">
          <p>Este empleado no tiene incidencias registradas</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {incidents.map((incident) => {
        const severityInfo = severityMap[incident.severity as keyof typeof severityMap] || {
          label: incident.severity,
          variant: 'outline' as const,
          color: 'text-gray-600',
        }
        const statusInfo = statusMap[incident.status as keyof typeof statusMap] || {
          label: incident.status,
          variant: 'outline' as const,
        }

        return (
          <Alert key={incident.id}>
            <AlertCircle className={`h-4 w-4 ${severityInfo.color}`} />
            <AlertDescription>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={severityInfo.variant}>{severityInfo.label}</Badge>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {incident.type}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(incident.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )
      })}
    </div>
  )
}

