'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type OrderActivity = {
  id: string
  type: 'order'
  serviceDate: Date
  status: string
  price: number
  timestamp: Date
}

type IncidentActivity = {
  id: string
  type: 'incident'
  incidentType: string
  severity: string
  status: string
  timestamp: Date
}

type Activity = OrderActivity | IncidentActivity

type RecentActivityTableProps = {
  activities: Activity[]
}

export function RecentActivityTable({ activities }: RecentActivityTableProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Actividad Reciente
      </h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500">
                  No hay actividad reciente
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={`${activity.type}-${activity.id}`}>
                  <TableCell>
                    <Badge variant="outline">
                      {activity.type === 'order' ? 'Pedido' : 'Incidencia'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {activity.type === 'order' ? (
                      <div>
                        <p className="font-medium">
                          Pedido para{' '}
                          {format(new Date(activity.serviceDate), 'dd/MM/yyyy')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activity.price.toFixed(2)} €
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">{activity.incidentType}</p>
                        <p className="text-sm text-gray-500">
                          Severidad: {activity.severity}
                        </p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusVariant(
                        activity.type === 'order'
                          ? activity.status
                          : activity.status
                      )}
                    >
                      {formatStatus(activity.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {format(
                      new Date(activity.timestamp),
                      "dd MMM 'a las' HH:mm",
                      { locale: es }
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'DELIVERED':
    case 'RESOLVED':
      return 'default'
    case 'CONFIRMED':
    case 'IN_PROGRESS':
      return 'secondary'
    case 'CANCELLED_BEFORE_CUTOFF':
    case 'CANCELLED_AFTER_CUTOFF':
    case 'REJECTED':
      return 'destructive'
    default:
      return 'outline'
  }
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    DRAFT: 'Borrador',
    CONFIRMED: 'Confirmado',
    CANCELLED_BEFORE_CUTOFF: 'Cancelado',
    LOCKED_AFTER_CUTOFF: 'Bloqueado',
    DELIVERED: 'Entregado',
    NO_SHOW: 'No recogido',
    ISSUE_REPORTED: 'Con incidencia',
    COMPENSATED: 'Compensado',
    REJECTED: 'Rechazado',
    OPEN: 'Abierta',
    IN_PROGRESS: 'En progreso',
    RESOLVED: 'Resuelta',
  }

  return statusMap[status] || status
}

