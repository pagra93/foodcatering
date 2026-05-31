'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
} from 'lucide-react'

type AlertType = 'error' | 'warning' | 'info' | 'success'

type AlertItem = {
  type: AlertType
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
}

type DashboardAlertsProps = {
  alerts: AlertItem[]
}

const alertConfig = {
  error: {
    icon: AlertCircle,
    className: 'border-red-200 bg-red-50 text-red-900',
    iconClassName: 'text-red-600',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    iconClassName: 'text-yellow-600',
  },
  info: {
    icon: Info,
    className: 'border-primary/30 bg-primary/10 text-primary',
    iconClassName: 'text-primary',
  },
  success: {
    icon: CheckCircle,
    className: 'border-green-200 bg-green-50 text-green-900',
    iconClassName: 'text-green-600',
  },
}

export function DashboardAlerts({ alerts }: DashboardAlertsProps) {
  if (alerts.length === 0) {
    return null
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Alertas y Notificaciones
      </h3>
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const config = alertConfig[alert.type]
          const Icon = config.icon

          return (
            <Alert key={index} className={config.className}>
              <Icon className={`h-4 w-4 ${config.iconClassName}`} />
              <AlertTitle className="ml-2">{alert.title}</AlertTitle>
              <AlertDescription className="ml-6">
                {alert.message}
                {alert.actionUrl && alert.actionLabel && (
                  <Link href={alert.actionUrl}>
                    <Button
                      variant="link"
                      className="ml-2 h-auto p-0 text-current underline"
                    >
                      {alert.actionLabel}
                    </Button>
                  </Link>
                )}
              </AlertDescription>
            </Alert>
          )
        })}
      </div>
    </Card>
  )
}

