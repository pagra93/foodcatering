/**
 * Página de gestión de Caterings (Tenants tipo CATERING)
 * Vista específica con KPIs globales, filtros avanzados y tabla detallada
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, AlertCircle, FileText } from 'lucide-react'
import { getRequiredSession } from '@/lib/auth/session'
import { getCaterings, getCateringsGlobalKPIs } from '@/lib/db/queries/caterings'
import { getCateringsQualityMetrics } from '@/lib/db/queries/catering-metrics'
import { parsePageParam } from '@/lib/utils/search-params'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CateringsGlobalKPIs } from '@/components/admin/caterings/CateringsGlobalKPIs'
import { CateringsTable } from '@/components/admin/caterings/CateringsTable'

const PAGE_SIZE = 25

// Skeletons de carga
function KPIsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

// Componente que carga los KPIs (reales)
async function CateringsKPIsData() {
  const kpis = await getCateringsGlobalKPIs()
  return <CateringsGlobalKPIs kpis={kpis} />
}

// Componente que carga la tabla
async function CateringsTableData({
  filter,
  page,
}: {
  filter?: string
  page: number
}) {
  // Paginación real de servidor. El filtro "expiring" (estado de documentos)
  // vive en Restaurant → se aplica en el where del listado.
  const { caterings, pagination } = await getCaterings({
    page,
    pageSize: PAGE_SIZE,
    docsAtRisk: filter === 'expiring',
  })

  // Mapear DocumentStatus (OK/WARNING/BLOCKED) al formato esperado por la UI
  const mapDocStatus = (status: string): 'OK' | 'EXPIRING' | 'EXPIRED' => {
    if (status === 'OK') return 'OK'
    if (status === 'WARNING') return 'EXPIRING'
    if (status === 'BLOCKED') return 'EXPIRED'
    return 'OK'
  }

  // Puntualidad/incidencias/rating EN VIVO en bloque (misma definición que el
  // detalle): una query agregada por métrica para toda la página, en vez de
  // 4 queries POR catering.
  const qualityByCatering = await getCateringsQualityMetrics(
    caterings.map((c) => c.id)
  )

  const cateringsFormatted = caterings.map((catering) => {
    const restaurant = catering.restaurants[0]
    const quality = qualityByCatering.get(catering.id)

    return {
      id: catering.id,
      name: catering.subdomain,
      displayName: catering.name,
      status: catering.status as 'ACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW',
      zones: (restaurant?.zones as Array<{ name: string }>) || [],
      dailyCapacity: restaurant?.dailyCapacity || 0,
      punctuality: quality?.punctualityRate ?? 100,
      incidentRate: quality?.incidentRate ?? 0,
      avgRating: quality?.averageRating ?? null,
      documentsStatus: restaurant?.documentsStatus ? mapDocStatus(restaurant.documentsStatus) : 'OK',
      lastInvoiceDate: null,
      // Cobro derivado del plan del catering (comisión % o precio fijo).
      pricing: (() => {
        const plan = restaurant?.saasPlan
        if (!plan) return 'Sin plan'
        if (plan.pricingModel === 'FIXED') return `${Number(plan.flatMonthlyFee ?? 0).toFixed(0)}€/mes`
        return `${(Number(plan.commissionPct ?? 0) * 100).toFixed(1)}%`
      })(),
    }
  })

  // Filtro por métrica CALCULADA (tasa de incidencias 30d): no vive en BD, se
  // aplica en JS SOBRE la página actual (no sobre el total de caterings).
  let rows = cateringsFormatted
  if (filter === 'incidents') {
    rows = rows.filter((c) => c.incidentRate > 5)
  }

  return (
    <>
      <CateringsTable caterings={rows} />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Página {pagination.page} de {pagination.totalPages} ·{' '}
            {pagination.total} caterings
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: '/admin/caterings',
                    query: {
                      ...(filter ? { filter } : {}),
                      page: String(pagination.page - 1),
                    },
                  }}
                >
                  Anterior
                </Link>
              </Button>
            )}
            {pagination.page < pagination.totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: '/admin/caterings',
                    query: {
                      ...(filter ? { filter } : {}),
                      page: String(pagination.page + 1),
                    },
                  }}
                >
                  Siguiente
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default async function CateringsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>
}) {
  await getRequiredSession()
  const { filter, page } = await searchParams
  const pageNum = parsePageParam(page)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caterings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de caterings y restaurantes proveedores
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/caterings?filter=expiring">
              <FileText className="mr-2 h-4 w-4" />
              Docs por Caducar
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/caterings?filter=incidents">
              <AlertCircle className="mr-2 h-4 w-4" />
              Incidencias Críticas
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/caterings/new">
              <Plus className="mr-2 h-4 w-4" />
              Crear Catering
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs Globales */}
      <Suspense fallback={<KPIsSkeleton />}>
        <CateringsKPIsData />
      </Suspense>

      {/* Filtro activo */}
      {filter && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            Filtrando por{' '}
            <span className="font-medium">
              {filter === 'expiring' ? 'documentos por caducar' : 'incidencias críticas'}
            </span>
          </span>
          <Link href="/admin/caterings" className="text-primary hover:underline">
            Quitar filtro
          </Link>
        </div>
      )}

      {/* Tabla de caterings */}
      <Suspense key={`${filter ?? 'all'}-${pageNum}`} fallback={<TableSkeleton />}>
        <CateringsTableData filter={filter} page={pageNum} />
      </Suspense>
    </div>
  )
}
