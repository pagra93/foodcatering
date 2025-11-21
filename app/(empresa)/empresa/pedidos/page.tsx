import { Suspense } from 'react'
import { FileDown, FileSpreadsheet } from 'lucide-react'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import { getOrders, type OrderFilters } from '@/lib/db/queries/empresa-pedidos'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { OrdersTable } from '@/components/empresa/pedidos/OrdersTable'
import { OrdersFilters } from '@/components/empresa/pedidos/OrdersFilters'
import { OrdersKPIs } from '@/components/empresa/pedidos/OrdersKPIs'

/**
 * Página principal de gestión de pedidos
 * FASE 3 - Histórico, filtros, export
 */

type SearchParams = {
  search?: string
  status?: string
  period?: string
  dateFrom?: string
  dateTo?: string
  employeeId?: string
  siteId?: string
  page?: string
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos y Consumo</h1>
          <p className="mt-1 text-sm text-gray-500">
            Histórico completo de pedidos y consumo de empleados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href="/api/empresa/pedidos/export" download>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </a>
          </Button>
          <Button variant="outline" disabled>
            <FileDown className="mr-2 h-4 w-4" />
            Informe Mensual
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <Suspense fallback={<KPIsSkeleton />}>
        <OrdersKPIsData searchParams={searchParams} />
      </Suspense>

      {/* Filtros y Tabla */}
      <Card className="p-6">
        <Suspense fallback={<TableSkeleton />}>
          <OrdersTableData searchParams={searchParams} />
        </Suspense>
      </Card>
    </div>
  )
}

// ============================================================================
// Componentes que cargan datos
// ============================================================================

async function OrdersKPIsData({ searchParams }: { searchParams: SearchParams }) {
  const tenant = await getCurrentTenant()
  const filters = buildFilters(searchParams)
  const result = await getOrders(tenant.id, filters)

  return <OrdersKPIs stats={result.stats} />
}

async function OrdersTableData({ searchParams }: { searchParams: SearchParams }) {
  const tenant = await getCurrentTenant()
  const filters = buildFilters(searchParams)
  const result = await getOrders(tenant.id, filters)

  return (
    <div className="space-y-4">
      <OrdersFilters currentFilters={filters} />
      <OrdersTable orders={result.orders} pagination={result.pagination} />
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function buildFilters(searchParams: SearchParams): OrderFilters {
  return {
    search: searchParams.search,
    status: searchParams.status || 'all',
    period: (searchParams.period as any) || 'month',
    dateFrom: searchParams.dateFrom,
    dateTo: searchParams.dateTo,
    employeeId: searchParams.employeeId,
    siteId: searchParams.siteId,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    pageSize: 20,
  }
}

// ============================================================================
// Skeletons
// ============================================================================

function KPIsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-3 w-full" />
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

