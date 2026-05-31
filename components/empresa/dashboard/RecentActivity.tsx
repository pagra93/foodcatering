'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Utensils } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

type ActivityItem = {
  id: string
  type: 'order'
  employeeId: string
  description: string
  status: string
  amount: number
  timestamp: Date
}

type RecentActivityProps = {
  activities: ActivityItem[]
}

const statusMap = {
  DRAFT: { label: 'Borrador', variant: 'outline' as const },
  CONFIRMED: { label: 'Confirmado', variant: 'default' as const },
  LOCKED_AFTER_CUTOFF: { label: 'Bloqueado', variant: 'secondary' as const },
  DELIVERED: { label: 'Entregado', variant: 'success' as const },
  CANCELLED_BEFORE_CUTOFF: { label: 'Cancelado', variant: 'destructive' as const },
  CANCELLED_AFTER_CUTOFF: { label: 'Cancelado (tardío)', variant: 'destructive' as const },
  NO_SHOW: { label: 'No recogido', variant: 'warning' as const },
  ISSUE_REPORTED: { label: 'Con incidencia', variant: 'warning' as const },
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-gray-400">
            No hay actividad reciente
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const statusInfo = statusMap[activity.status as keyof typeof statusMap] || {
                label: activity.status,
                variant: 'outline' as const,
              }

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Utensils className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Empleado #{activity.employeeId.slice(-8)} •{' '}
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      <span className="text-sm font-medium text-gray-700">
                        {activity.amount.toLocaleString('es-ES', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

