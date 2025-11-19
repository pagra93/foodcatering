import { Suspense } from 'react'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import { getCompanyDashboardData } from '@/lib/db/queries/empresa-dashboard'
import { DashboardKPIs } from '@/components/empresa/dashboard/DashboardKPIs'
import { DashboardCharts } from '@/components/empresa/dashboard/DashboardCharts'
import { DashboardAlerts } from '@/components/empresa/dashboard/DashboardAlerts'
import { RecentActivity } from '@/components/empresa/dashboard/RecentActivity'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

/**
 * Dashboard principal del portal de empresa
 * FASE 1 - KPIs, gráficas y alertas
 */
export default async function EmpresaDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Resumen de actividad y métricas clave de tu empresa
        </p>
      </div>

      {/* KPIs principales */}
      <Suspense fallback={<KPIsSkeleton />}>
        <DashboardKPIsData />
      </Suspense>

      {/* Alertas */}
      <Suspense fallback={<AlertsSkeleton />}>
        <DashboardAlertsData />
      </Suspense>

      {/* Gráficas y actividad reciente */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <DashboardChartsData />
        </Suspense>

        <Suspense fallback={<ActivitySkeleton />}>
          <RecentActivityData />
        </Suspense>
      </div>
    </div>
  )
}

// ============================================================================
// Componentes que cargan datos
// ============================================================================

async function DashboardKPIsData() {
  const tenant = await getCurrentTenant()
  const data = await getCompanyDashboardData(tenant.id)
  
  return <DashboardKPIs data={data.kpis} />
}

async function DashboardAlertsData() {
  const tenant = await getCurrentTenant()
  const data = await getCompanyDashboardData(tenant.id)
  
  return <DashboardAlerts alerts={data.alerts} />
}

async function DashboardChartsData() {
  const tenant = await getCurrentTenant()
  const data = await getCompanyDashboardData(tenant.id)
  
  return <DashboardCharts data={data.charts} />
}

async function RecentActivityData() {
  const tenant = await getCurrentTenant()
  const data = await getCompanyDashboardData(tenant.id)
  
  return <RecentActivity activities={data.recentActivity} />
}

// ============================================================================
// Skeletons
// ============================================================================

function KPIsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <Card key={i} className="p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-3 w-full" />
        </Card>
      ))}
    </div>
  )
}

function AlertsSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-64 w-full" />
    </Card>
  )
}

function ActivitySkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

