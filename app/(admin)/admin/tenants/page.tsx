/**
 * Página de listado de Tenants
 * Con filtros, búsqueda y paginación
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getTenants } from '@/lib/db/queries/tenants'
import { parseIntParam, parsePageParam } from '@/lib/utils/search-params'
import type { TenantFiltersInput } from '@/lib/validations/tenant'
import { TenantsTable } from '@/components/admin/tenants/TenantsTable'
import { TenantsFilters } from '@/components/admin/tenants/TenantsFilters'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type PageProps = {
  searchParams: {
    search?: string
    type?: string
    status?: string
    sortBy?: string
    sortOrder?: string
    page?: string
    pageSize?: string
  }
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  )
}

async function TenantsTableData({ searchParams }: PageProps) {
  // Parsear filtros
  const filters: TenantFiltersInput = {
    search: searchParams.search,
    type: (searchParams.type as any) || 'ALL',
    status: (searchParams.status as any) || 'ALL',
    sortBy: (searchParams.sortBy as any) || 'createdAt',
    sortOrder: (searchParams.sortOrder as any) || 'desc',
    page: parsePageParam(searchParams.page),
    pageSize: parseIntParam(searchParams.pageSize, {
      min: 1,
      max: 100,
      fallback: 20,
    }),
  }

  const { tenants, pagination } = await getTenants(filters)

  return <TenantsTable tenants={tenants} pagination={pagination} />
}

export default function TenantsPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tenants</h1>
          <p className="mt-2 text-gray-600">
            Gestiona empresas y caterings de la plataforma
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/tenants/new">
            <Plus className="mr-2 h-4 w-4" />
            Crear Tenant
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <TenantsFilters />

      {/* Tabla */}
      <Suspense fallback={<TableSkeleton />}>
        <TenantsTableData searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

