/**
 * KPIs de Incidencias
 * ♻️ Estructura reutilizada del portal de Admin
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Clock, CheckCircle2, Euro, Activity } from 'lucide-react'

type IncidentsKPIsProps = {
  kpis: {
    open: number
    inProgress: number
    resolved: number
    avgResolutionTime: number
    totalCompensations: number
  }
}

export function IncidentsKPIs({ kpis }: IncidentsKPIsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {/* Abiertas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Abiertas</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{kpis.open}</div>
          <p className="text-xs text-muted-foreground">Sin asignar</p>
        </CardContent>
      </Card>

      {/* En progreso */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
          <Activity className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {kpis.inProgress}
          </div>
          <p className="text-xs text-muted-foreground">En resolución</p>
        </CardContent>
      </Card>

      {/* Resueltas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resueltas</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {kpis.resolved}
          </div>
          <p className="text-xs text-muted-foreground">Cerradas</p>
        </CardContent>
      </Card>

      {/* Tiempo medio */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tiempo Medio</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.avgResolutionTime}m</div>
          <p className="text-xs text-muted-foreground">Resolución</p>
        </CardContent>
      </Card>

      {/* Compensaciones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compensaciones</CardTitle>
          <Euro className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {kpis.totalCompensations.toFixed(2)}€
          </div>
          <p className="text-xs text-muted-foreground">Total pagado</p>
        </CardContent>
      </Card>
    </div>
  )
}

