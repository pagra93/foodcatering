import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Upload, FileDown } from 'lucide-react'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import { getEmployees, type EmployeeFilters } from '@/lib/db/queries/empresa-empleados'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { EmployeesTable } from '@/components/empresa/empleados/EmployeesTable'
import { EmployeesFilters } from '@/components/empresa/empleados/EmployeesFilters'
import { EmployeesKPIs } from '@/components/empresa/empleados/EmployeesKPIs'

/**
 * Página principal de gestión de empleados
 * FASE 2 - Lista, filtros, KPIs
 */

type SearchParams = {
  search?: string
  status?: string
  department?: string
  siteId?: string
  page?: string
}

export default async function EmpleadosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión completa de empleados y beneficiarios
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/empresa/empleados/importar">
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/empresa/empleados/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Empleado
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <Suspense fallback={<KPIsSkeleton />}>
        <EmployeesKPIsData searchParams={searchParams} />
      </Suspense>

      {/* Filtros y Tabla */}
      <Card className="p-6">
        <Suspense fallback={<TableSkeleton />}>
          <EmployeesTableData searchParams={searchParams} />
        </Suspense>
      </Card>
    </div>
  )
}

// ============================================================================
// Componentes que cargan datos
// ============================================================================

async function EmployeesKPIsData({ searchParams }: { searchParams: SearchParams }) {
  const tenant = await getCurrentTenant()
  const filters = buildFilters(searchParams)
  const { employees } = await getEmployees(tenant.id, filters)

  // Calcular KPIs de la lista actual
  const totalEmployees = employees.length
  const activeWithOrders = employees.filter((e) => e.metrics.ordersLast30Days > 0).length
  const totalSpent = employees.reduce((sum, e) => sum + e.metrics.totalSpent, 0)

  return (
    <EmployeesKPIs
      total={totalEmployees}
      active={activeWithOrders}
      totalSpent={totalSpent}
    />
  )
}

async function EmployeesTableData({ searchParams }: { searchParams: SearchParams }) {
  const tenant = await getCurrentTenant()
  const filters = buildFilters(searchParams)
  const result = await getEmployees(tenant.id, filters)

  return (
    <div className="space-y-4">
      <EmployeesFilters
        currentFilters={filters}
        departments={result.filters.departments}
      />
      <EmployeesTable
        employees={result.employees}
        pagination={result.pagination}
      />
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function buildFilters(searchParams: SearchParams): EmployeeFilters {
  return {
    search: searchParams.search,
    status: (searchParams.status as any) || 'all',
    department: searchParams.department,
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
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

