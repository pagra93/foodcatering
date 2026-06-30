/**
 * Dashboard del Súper Admin
 * Centro de control operacional con métricas en tiempo real
 */

import { Suspense } from 'react'
import {
  Building2,
  ChefHat,
  ShoppingCart,
  AlertTriangle,
  Euro,
  TrendingUp,
} from 'lucide-react'
import { getRequiredSession } from '@/lib/auth/session'
import {
  getDashboardKPIs,
  getDashboardCharts,
  getDashboardAlerts,
  getRecentActivity,
} from '@/lib/db/queries/admin-dashboard'
import { KPICard } from '@/components/admin/dashboard/KPICard'
import { AlertsPanel } from '@/components/admin/dashboard/AlertsPanel'
import { ChartsSection } from '@/components/admin/dashboard/ChartsSection'
import { RecentActivityTable } from '@/components/admin/dashboard/RecentActivityTable'
import { QuickActionsPanel } from '@/components/admin/dashboard/QuickActionsPanel'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/utils'

// Loading skeletons
function KPIsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  )
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-64 md:col-span-2" />
      <Skeleton className="h-64" />
      <Skeleton className="h-64 md:col-span-2 lg:col-span-3" />
    </div>
  )
}

// Componente de KPIs
async function DashboardKPIs() {
  const kpis = await getDashboardKPIs()

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <KPICard
        title="Empresas Activas"
        value={kpis.tenants.activeCompanies}
        subtitle={`${kpis.tenants.companies} totales`}
        icon={Building2}
        variant="default"
      />

      <KPICard
        title="Caterings Activos"
        value={kpis.tenants.activeCaterings}
        subtitle={`${kpis.tenants.caterings} totales`}
        icon={ChefHat}
        variant="info"
      />

      <KPICard
        title="Pedidos de Hoy"
        value={kpis.orders.today}
        subtitle={`${kpis.orders.delivered} entregados`}
        icon={ShoppingCart}
        variant="success"
      />

      <KPICard
        title="Incidencias Abiertas"
        value={kpis.incidents.open}
        subtitle={`${kpis.incidents.critical} críticas`}
        icon={AlertTriangle}
        variant={kpis.incidents.critical > 0 ? 'error' : 'warning'}
      />

      <KPICard
        title="Facturado Mes"
        value={formatPrice(kpis.revenue.monthTotal)}
        subtitle={`${formatPrice(kpis.revenue.monthCommissions)} comisiones`}
        icon={Euro}
        variant="success"
      />

      <KPICard
        title="Adopción"
        value={`${kpis.adoption.percentage}%`}
        subtitle={`${kpis.adoption.activeEmployees}/${kpis.adoption.totalEmployees} empleados`}
        icon={TrendingUp}
        variant={kpis.adoption.percentage >= 70 ? 'success' : 'warning'}
      />
    </div>
  )
}

// Componente de gráficas
async function DashboardCharts() {
  const charts = await getDashboardCharts()

  return <ChartsSection data={charts} />
}

// Componente de alertas
async function DashboardAlerts() {
  const alerts = await getDashboardAlerts()

  return <AlertsPanel alerts={alerts} />
}

// Componente de actividad
async function DashboardActivity() {
  const activity = await getRecentActivity()

  return <RecentActivityTable activity={activity} />
}

export default async function AdminDashboardPage() {
  const session = await getRequiredSession()

  return (
    <div className="space-y-8">
      {/* Header más limpio */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bienvenido, <span className="font-medium">{session.user.name}</span>
        </p>
      </div>

      {/* KPIs con mejor espaciado */}
      <Suspense fallback={<KPIsSkeleton />}>
        <DashboardKPIs />
      </Suspense>

      {/* Gráficas */}
      <Suspense fallback={<ChartsSkeleton />}>
        <DashboardCharts />
      </Suspense>

      {/* Alertas y Acciones Rápidas */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <DashboardAlerts />
          </Suspense>
        </div>
        <div>
          <QuickActionsPanel />
        </div>
      </div>

      {/* Actividad Reciente */}
      <Suspense fallback={<Skeleton className="h-96" />}>
        <DashboardActivity />
      </Suspense>
    </div>
  )
}

