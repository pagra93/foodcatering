'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { History } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type OrderHistoryProps = {
  history: Array<{
    id: string
    version: number
    changedAt: Date
    changedBy: string
    changeReason: string
    prevValues: any
    newValues: any
  }>
}

const changeReasonMap = {
  CREATED: 'Pedido creado',
  EMPLOYEE_MODIFIED: 'Modificado por empleado',
  CANCELLED_BY_EMPLOYEE: 'Cancelado por empleado',
  LOCKED: 'Bloqueado (pasado cutoff)',
  DELIVERED: 'Marcado como entregado',
  NO_SHOW_REPORTED: 'Reportado como no recogido',
  ISSUE_CREATED: 'Incidencia creada',
  ADMIN_OVERRIDE: 'Modificado por administrador',
}

export function OrderHistory({ history }: OrderHistoryProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <History className="h-5 w-5 text-purple-600" />
        Historial de Cambios
      </h3>

      <div className="space-y-4">
        {history.map((entry, index) => (
          <div
            key={entry.id}
            className="relative flex gap-4 pb-4 border-b last:border-0 last:pb-0"
          >
            {/* Timeline dot */}
            <div className="relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-purple-600 bg-white">
                <span className="text-xs font-semibold text-purple-600">
                  v{entry.version}
                </span>
              </div>
              {index < history.length - 1 && (
                <div className="absolute left-4 top-8 h-full w-0.5 bg-gray-200" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {changeReasonMap[entry.changeReason as keyof typeof changeReasonMap] ||
                      entry.changeReason}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {format(new Date(entry.changedAt), "d/MM/yyyy 'a las' HH:mm", {
                      locale: es,
                    })}
                  </p>
                </div>
                <Badge variant="outline">Versión {entry.version}</Badge>
              </div>

              {/* Cambios */}
              {entry.prevValues && entry.newValues && (
                <div className="mt-3 rounded-md bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Cambios:</p>
                  <div className="space-y-1 text-xs">
                    {Object.keys(entry.newValues).map((key) => {
                      const oldValue = entry.prevValues?.[key]
                      const newValue = entry.newValues[key]
                      
                      if (oldValue === newValue) return null
                      
                      return (
                        <div key={key} className="flex gap-2">
                          <span className="text-gray-600">{key}:</span>
                          <span className="text-red-600 line-through">{String(oldValue)}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600 font-medium">{String(newValue)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

