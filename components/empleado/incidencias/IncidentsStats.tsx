'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'

type IncidentsStatsProps = {
  stats: {
    total: number
    open: number
    resolved: number
  }
}

export function IncidentsStats({ stats }: IncidentsStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Incidencias</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">Todas tus incidencias</p>
        </CardContent>
      </Card>

      {/* Abiertas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En Revisión</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.open}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Esperando respuesta del catering
          </p>
        </CardContent>
      </Card>

      {/* Resueltas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resueltas</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.resolved}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Problemas solucionados
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

