/**
 * Página de gestión de Empresas
 * Dashboard completo con KPIs globales y listado de empresas
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, FileText, AlertCircle } from 'lucide-react'
import { getRequiredSession } from '@/lib/auth/session'
import { getCompaniesGlobalKPIs, getCompanies } from '@/lib/db/queries/companies'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { CompaniesGlobalKPIs } from '@/components/admin/companies/CompaniesGlobalKPIs'
import { CompaniesTable } from '@/components/admin/companies/CompaniesTable'

// ============================================================================
// SKELETONS
// ============================================================================

function KPIsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-4 w-20 mb-3" />
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
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

// ============================================================================
// COMPONENTES DE DATOS
// ============================================================================

async function CompaniesKPIsData() {
  const kpis = await getCompaniesGlobalKPIs()
  return <CompaniesGlobalKPIs kpis={kpis} />
}

async function CompaniesTableData() {
  const { companies } = await getCompanies({
    page: 1,
    pageSize: 100, // Sin paginación por ahora
  })
  return <CompaniesTable companies={companies} />
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

export default async function EmpresasPage() {
  await getRequiredSession()

  return (
    <div className="space-y-6">
      {/* Header con acciones rápidas */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión completa de empresas clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/compliance/fiscal-audit">
              <FileText className="mr-2 h-4 w-4" />
              Reportes
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/empresas/alertas">
              <AlertCircle className="mr-2 h-4 w-4" />
              Alertas
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/empresas/new">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Empresa
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs Globales */}
      <Suspense fallback={<KPIsSkeleton />}>
        <CompaniesKPIsData />
      </Suspense>

      {/* Tabla de Empresas */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Listado de Empresas
          </h3>
          <p className="text-sm text-gray-500">
            Vista completa con KPIs, alertas y acciones
          </p>
        </div>
        <div className="p-6">
          <Suspense fallback={<TableSkeleton />}>
            <CompaniesTableData />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

