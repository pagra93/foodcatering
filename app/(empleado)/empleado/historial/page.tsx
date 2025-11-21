/**
 * Historial de Pedidos del Empleado
 * Vista completa de pedidos anteriores con filtros
 */

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/tenant/get-tenant'
import {
  getOrderHistory,
  getOrderHistoryKPIs,
  getAvailableMonths,
} from '@/lib/db/queries/empleado-historial'
import { HistorialKPIs } from '@/components/empleado/historial/HistorialKPIs'
import { HistorialFilters } from '@/components/empleado/historial/HistorialFilters'
import { HistorialTable } from '@/components/empleado/historial/HistorialTable'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

type PageProps = {
  searchParams: {
    month?: string
    status?: string
    search?: string
    page?: string
  }
}

// ============================================================================
// Server Component - Datos
// ============================================================================

async function HistorialData({ searchParams }: PageProps) {
  const session = await auth()
  const tenant = await getTenant()

  if (!session || !tenant.id) {
    redirect('/login')
  }

  // Buscar el empleado
  const { prisma } = await import('@/lib/db/prisma')
  const employee = await prisma.employee.findFirst({
    where: {
      userId: session.user.id,
      tenantId: tenant.id,
      status: 'ACTIVE',
    },
  })

  if (!employee) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No eres empleado</AlertTitle>
          <AlertDescription>
            No se encontró un perfil de empleado asociado a tu usuario.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Parsear filtros
  const filters = {
    month: searchParams.month ? new Date(searchParams.month) : undefined,
    status: searchParams.status || undefined,
    search: searchParams.search || undefined,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
  }

  // Obtener datos
  const [kpis, history, availableMonths] = await Promise.all([
    getOrderHistoryKPIs(employee.id),
    getOrderHistory({
      employeeId: employee.id,
      ...filters,
    }),
    getAvailableMonths(employee.id),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi Historial</h1>
        <p className="text-gray-600 mt-1">
          Todos tus pedidos anteriores
        </p>
      </div>

      {/* KPIs */}
      <HistorialKPIs data={kpis} />

      {/* Filtros */}
      <HistorialFilters
        availableMonths={availableMonths}
        currentFilters={filters}
      />

      {/* Tabla */}
      <HistorialTable
        orders={history.orders}
        pagination={history.pagination}
      />
    </div>
  )
}

// ============================================================================
// Loading State
// ============================================================================

function HistorialLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>

      <Skeleton className="h-20 w-full mb-6" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

// ============================================================================
// Main Page Export
// ============================================================================

export default function HistorialPage(props: PageProps) {
  return (
    <Suspense fallback={<HistorialLoading />}>
      <HistorialData {...props} />
    </Suspense>
  )
}

