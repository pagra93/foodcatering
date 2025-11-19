/**
 * Página: Dashboard del Catering
 * Ruta: /catering/dashboard
 * 
 * Vista principal del portal del catering con:
 * - KPIs de producción, calidad e incidencias
 * - Alertas y notificaciones
 * - Acciones rápidas
 * - Actividad reciente
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCateringDashboard } from '@/lib/db/queries/catering-dashboard'
import { DashboardKPIs } from '@/components/catering/dashboard/DashboardKPIs'
import { QuickActionsPanel } from '@/components/catering/dashboard/QuickActionsPanel'
import { DashboardAlerts } from '@/components/catering/dashboard/DashboardAlerts'
import { RecentActivityTable } from '@/components/catering/dashboard/RecentActivityTable'

export const metadata = {
  title: 'Dashboard - Catering',
  description: 'Vista general del portal del catering',
}

export default async function CateringDashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Obtener datos del dashboard
  const dashboardData = await getCateringDashboard(session.user.tenantId)

  // Preparar KPIs para el componente
  const kpis = [
    {
      label: 'Producción Hoy',
      value: dashboardData.kpis.production.today,
      format: 'number' as const,
      description: 'Menús a preparar',
    },
    {
      label: 'Capacidad Utilizada',
      value: `${dashboardData.kpis.production.capacityUsed}/${dashboardData.kpis.production.capacity}`,
      description: `${dashboardData.kpis.production.capacityPercentage}% del total`,
    },
    {
      label: 'Tasa de Puntualidad',
      value: dashboardData.kpis.quality.punctualityRate,
      format: 'percentage' as const,
      description: 'Últimos 30 días',
      trend: dashboardData.kpis.quality.punctualityRate >= 90 ? 'up' as const : 'down' as const,
    },
    {
      label: 'Incidencias Abiertas',
      value: dashboardData.kpis.incidents.open,
      format: 'number' as const,
      description: `${dashboardData.kpis.incidents.total30Days} este mes`,
    },
    {
      label: 'Platos Activos',
      value: dashboardData.kpis.dishes.active,
      format: 'number' as const,
      description: 'En catálogo',
    },
    {
      label: 'Menús Publicados',
      value: dashboardData.kpis.dishes.menusPublished,
      format: 'number' as const,
      description: 'Próximos 7 días',
    },
    {
      label: 'Empresas Activas',
      value: dashboardData.kpis.companies.assigned,
      format: 'number' as const,
      description: 'Asignadas',
    },
    {
      label: 'Valoración Media',
      value: dashboardData.kpis.quality.averageRating
        ? dashboardData.kpis.quality.averageRating.toFixed(1)
        : 'N/A',
      description: 'De los últimos pedidos',
    },
  ]

  // Combinar actividad de pedidos e incidencias
  const allActivity = [
    ...dashboardData.recentActivity.orders,
    ...dashboardData.recentActivity.incidents,
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Vista general de la operación del catering
        </p>
      </div>

      {/* KPIs */}
      <DashboardKPIs kpis={kpis} />

      {/* Quick Actions */}
      <QuickActionsPanel />

      {/* Alertas (si hay) */}
      {dashboardData.alerts.length > 0 && (
        <DashboardAlerts alerts={dashboardData.alerts} />
      )}

      {/* Actividad Reciente */}
      <RecentActivityTable activities={allActivity} />

      {/* Info del Restaurant */}
      {dashboardData.restaurant && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Horario de Cutoff</p>
            <p className="text-2xl font-bold text-gray-900">
              {dashboardData.restaurant.cutoffTime}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Capacidad Diaria</p>
            <p className="text-2xl font-bold text-gray-900">
              {dashboardData.restaurant.dailyCapacity} menús
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Días Operativos</p>
            <p className="text-sm font-medium text-gray-900 mt-2">
              {Array.isArray(dashboardData.restaurant.operationalDays)
                ? (dashboardData.restaurant.operationalDays as string[]).join(', ')
                : 'No configurado'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

