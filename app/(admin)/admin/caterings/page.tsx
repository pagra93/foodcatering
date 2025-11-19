/**
 * Página de gestión de Caterings (Tenants tipo CATERING)
 * Vista específica con KPIs globales, filtros avanzados y tabla detallada
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, AlertCircle, FileText } from 'lucide-react'
import { getRequiredSession } from '@/lib/auth/session'
import { getCaterings } from '@/lib/db/queries/caterings'
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

// Componente que carga los KPIs
async function CateringsKPIsData() {
  // TODO: Query real de KPIs globales
  const mockKPIs = {
    totalCaterings: 5,
    activeCaterings: 3,
    suspendedCaterings: 1,
    underReviewCaterings: 1,
    todayOrders: 450,
    confirmedOrders: 420,
    deliveredOrders: 385,
    incidentsOrders: 15,
    avgPunctuality: 94,
    openIncidents: 8,
    expiringDocs: 2,
    avgRating: 4.6,
  }

  return <CateringsGlobalKPIs kpis={mockKPIs} />
}

// Componente que carga la tabla
async function CateringsTableData() {
  // Obtener caterings reales de la BD
  const { caterings } = await getCaterings({
    page: 1,
    pageSize: 100, // Traer todos para la tabla (sin paginación por ahora)
  })

  // Mapear a formato esperado por el componente
  const cateringsFormatted = caterings.map((catering) => {
    const restaurant = catering.restaurants[0]
    
    // Mapear DocumentStatus (OK/WARNING/BLOCKED) al formato esperado por la UI
    const mapDocStatus = (status: string): 'OK' | 'EXPIRING' | 'EXPIRED' => {
      if (status === 'OK') return 'OK'
      if (status === 'WARNING') return 'EXPIRING'
      if (status === 'BLOCKED') return 'EXPIRED'
      return 'OK'
    }
    
    return {
      id: catering.id,
      name: catering.subdomain,
      displayName: catering.name,
      status: catering.status as 'ACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW',
      zones: restaurant?.zones as Array<{ name: string }> || [],
      dailyCapacity: restaurant?.dailyCapacity || 0,
      punctuality: restaurant?.punctualityRate ? Number(restaurant.punctualityRate) : null,
      incidentRate: restaurant?.incidentRate ? Number(restaurant.incidentRate) : null,
      avgRating: restaurant?.averageRating ? Number(restaurant.averageRating) : null,
      documentsStatus: restaurant?.documentsStatus ? mapDocStatus(restaurant.documentsStatus) : 'OK',
      lastInvoiceDate: null, // TODO: implementar cuando tengamos facturas
      commission: restaurant?.commission ? Number(restaurant.commission) : 0,
    }
  })

  return <CateringsTable caterings={cateringsFormatted} />
}

export default async function CateringsPage() {
  await getRequiredSession()

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

      {/* Tabla de caterings */}
      <Suspense fallback={<TableSkeleton />}>
        <CateringsTableData />
      </Suspense>
    </div>
  )
}

