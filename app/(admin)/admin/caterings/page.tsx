/**
 * Página de gestión de Caterings (Tenants tipo CATERING)
 * Vista específica con KPIs globales, filtros avanzados y tabla detallada
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, AlertCircle, FileText } from 'lucide-react'
import { getRequiredSession } from '@/lib/auth/session'
import { getCaterings, getCateringsGlobalKPIs } from '@/lib/db/queries/caterings'
import { getCateringQualityMetrics } from '@/lib/db/queries/catering-metrics'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CateringsGlobalKPIs } from '@/components/admin/caterings/CateringsGlobalKPIs'
import { CateringsTable } from '@/components/admin/caterings/CateringsTable'

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
async function CateringsTableData({ filter }: { filter?: string }) {
  // Obtener caterings reales de la BD
  const { caterings } = await getCaterings({
    page: 1,
    pageSize: 100, // Traer todos para la tabla (sin paginación por ahora)
  })

  // Mapear DocumentStatus (OK/WARNING/BLOCKED) al formato esperado por la UI
  const mapDocStatus = (status: string): 'OK' | 'EXPIRING' | 'EXPIRED' => {
    if (status === 'OK') return 'OK'
    if (status === 'WARNING') return 'EXPIRING'
    if (status === 'BLOCKED') return 'EXPIRED'
    return 'OK'
  }

  // Mapear a formato esperado por el componente. Puntualidad/incidencias/rating
  // EN VIVO (mismo helper que el detalle) para que cuadren entre pantallas.
  const cateringsFormatted = await Promise.all(
    caterings.map(async (catering) => {
      const restaurant = catering.restaurants[0]
      const quality = await getCateringQualityMetrics(catering.id)

      return {
        id: catering.id,
        name: catering.subdomain,
        displayName: catering.name,
        status: catering.status as 'ACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW',
        zones: (restaurant?.zones as Array<{ name: string }>) || [],
        dailyCapacity: restaurant?.dailyCapacity || 0,
        punctuality: quality.punctualityRate,
        incidentRate: quality.incidentRate,
        avgRating: quality.averageRating,
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
  )

  // Filtros rápidos desde los botones de cabecera
  let rows = cateringsFormatted
  if (filter === 'expiring') {
    rows = rows.filter((c) => c.documentsStatus !== 'OK')
  } else if (filter === 'incidents') {
    rows = rows.filter((c) => c.incidentRate > 5)
  }

  return <CateringsTable caterings={rows} />
}

export default async function CateringsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  await getRequiredSession()
  const { filter } = await searchParams

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
      <Suspense key={filter ?? 'all'} fallback={<TableSkeleton />}>
        <CateringsTableData filter={filter} />
      </Suspense>
    </div>
  )
}

