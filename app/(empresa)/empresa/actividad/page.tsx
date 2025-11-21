/**
 * Módulo de Registro de Actividad - Portal Empresa
 * ♻️ Reutiliza tabla AuditLog ya existente
 */

import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import {
  getActivityLog,
  getActivityStats,
  ACTION_TYPES,
  RESOURCE_TYPES,
} from '@/lib/db/queries/empresa-actividad'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Suspense } from 'react'
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
import { Activity, User, Zap } from 'lucide-react'

// ============================================================================
// Server Component - Datos con cache
// ============================================================================

async function ActividadData({ searchParams }: { searchParams: any }) {
  const tenant = await getCurrentTenant()
  const tenantId = tenant.id

  const page = searchParams.page ? parseInt(searchParams.page) : 1

  // Fetch en paralelo
  const [activityLog, stats] = await Promise.all([
    getActivityLog(tenantId, { page, limit: 50 }),
    getActivityStats(tenantId),
  ])

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Acciones (30 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {stats.actionsByType.slice(0, 3).map((item) => (
                <Badge key={item.action} variant="outline" className="text-xs">
                  {item.label}: {item.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Usuarios Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topUsers.length}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de actividad */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Recurso</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLog.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', {
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {log.user?.nameEnc || 'Usuario desconocido'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.user?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        ACTION_TYPES[log.action as keyof typeof ACTION_TYPES]
                          ?.color
                      }
                    >
                      {ACTION_TYPES[log.action as keyof typeof ACTION_TYPES]
                        ?.label || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {
                          RESOURCE_TYPES[
                            log.resourceType as keyof typeof RESOURCE_TYPES
                          ]?.icon
                        }{' '}
                        {
                          RESOURCE_TYPES[
                            log.resourceType as keyof typeof RESOURCE_TYPES
                          ]?.label
                        }
                      </div>
                      {log.resourceId && (
                        <div className="text-xs text-muted-foreground">
                          #{log.resourceId.slice(-8)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {log.ipAddress || 'N/A'}
                    </code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {activityLog.logs.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No hay actividad registrada
            </div>
          )}

          {/* Paginación */}
          {activityLog.pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Página {activityLog.pagination.page} de{' '}
                {activityLog.pagination.totalPages}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Loading State
// ============================================================================

function ActividadLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Main Page Export
// ============================================================================

export default function ActividadPage({ searchParams }: { searchParams: any }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Registro de Actividad
        </h1>
        <p className="text-muted-foreground">
          Historial completo de acciones realizadas en la plataforma
        </p>
      </div>

      {/* Content con Suspense */}
      <Suspense fallback={<ActividadLoading />}>
        <ActividadData searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

