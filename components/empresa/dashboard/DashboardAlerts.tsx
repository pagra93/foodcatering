'use client'

import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'

type Alert = {
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
}

type DashboardAlertsProps = {
  alerts: Alert[]
}

export function DashboardAlerts({ alerts }: DashboardAlertsProps) {
  if (alerts.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <Info className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">Todo en orden</AlertTitle>
        <AlertDescription className="text-green-700">
          No hay alertas activas en este momento
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Alertas</h2>
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const Icon =
            alert.type === 'error'
              ? AlertCircle
              : alert.type === 'warning'
                ? AlertTriangle
                : Info

          const variant =
            alert.type === 'error'
              ? 'destructive'
              : alert.type === 'warning'
                ? 'default'
                : 'default'

          return (
            <Alert key={index} variant={variant} className={
              alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' : ''
            }>
              <Icon className="h-4 w-4" />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>{alert.message}</span>
                {alert.actionUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={alert.actionUrl}>
                      {alert.actionLabel || 'Ver más'}
                    </Link>
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )
        })}
      </div>
    </div>
  )
}

