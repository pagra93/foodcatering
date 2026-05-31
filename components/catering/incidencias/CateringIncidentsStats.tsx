'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'

type CateringIncidentsStatsProps = {
  stats: {
    total: number
    open: number
    inProgress: number
    resolved: number
    avgResolutionTime: number
  }
}

export function CateringIncidentsStats({ stats }: CateringIncidentsStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Incidencias</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">Todas las incidencias</p>
        </CardContent>
      </Card>

      {/* Abiertas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Abiertas</CardTitle>
          <Clock className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.open}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Requieren atención inmediata
          </p>
        </CardContent>
      </Card>

      {/* En Progreso */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En Revisión</CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{stats.inProgress}</div>
          <p className="text-xs text-muted-foreground mt-1">Siendo procesadas</p>
        </CardContent>
      </Card>

      {/* Resueltas + Tiempo Medio */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resueltas</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Tiempo medio: {stats.avgResolutionTime} min
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

