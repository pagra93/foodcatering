/**
 * Módulo de Incidencias - Portal Empresa
 * ♻️ Reutiliza estructura del portal de Admin (IncidentsTab)
 */

import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import {
  getIncidentsKPIs,
  getIncidents,
} from '@/lib/db/queries/empresa-incidencias'
import { IncidentsKPIs } from '@/components/empresa/incidencias/IncidentsKPIs'
import { IncidentsList } from '@/components/empresa/incidencias/IncidentsList'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

// ============================================================================
// Server Component - Datos con cache
// ============================================================================

async function IncidentsData({ searchParams }: { searchParams: any }) {
  const tenant = await getCurrentTenant()
  const tenantId = tenant.id

  const page = searchParams.page ? parseInt(searchParams.page) : 1

  // Fetch en paralelo
  const [kpis, incidentsData] = await Promise.all([
    getIncidentsKPIs(tenantId),
    getIncidents(tenantId, {
      page,
      limit: 20,
    }),
  ])

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <IncidentsKPIs kpis={kpis} />

      {/* Listado */}
      <IncidentsList
        incidents={incidentsData.incidents}
        pagination={incidentsData.pagination}
      />
    </div>
  )
}

// ============================================================================
// Loading State
// ============================================================================

function IncidentsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-20" />
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

export default function IncidentsPage({ searchParams }: { searchParams: any }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incidencias</h1>
          <p className="text-muted-foreground">
            Gestiona y resuelve incidencias con el servicio de comidas
          </p>
        </div>

        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Incidencia
        </Button>
      </div>

      {/* Content con Suspense */}
      <Suspense fallback={<IncidentsLoading />}>
        <IncidentsData searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

