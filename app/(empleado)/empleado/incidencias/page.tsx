import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getEmployeeIncidents, getEmployeeIncidentStats } from '@/lib/db/queries/empleado-incidencias'
import { IncidentsList } from '@/components/empleado/incidencias/IncidentsList'
import { IncidentsStats } from '@/components/empleado/incidencias/IncidentsStats'
import { ReportIncidentButton } from '@/components/empleado/incidencias/ReportIncidentButton'

export const metadata = {
  title: 'Mis Incidencias | Portal Empleado',
  description: 'Gestiona tus incidencias y reporta problemas con tus pedidos',
}

export default async function IncidenciasEmpleadoPage() {
  const session = await auth()
  if (!session || !session.user) {
    redirect('/login')
  }

  // Obtener datos del empleado
  const employee = await prisma.employee.findFirst({
    where: {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      status: 'ACTIVE',
    },
  })

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-gray-500">No se encontró tu perfil de empleado.</p>
      </div>
    )
  }

  // Obtener incidencias y estadísticas
  const [incidents, stats] = await Promise.all([
    getEmployeeIncidents(employee.id),
    getEmployeeIncidentStats(employee.id),
  ])

  // Obtener pedidos recientes para poder reportar incidencias
  const recentOrders = await prisma.order.findMany({
    where: {
      employeeId: employee.id,
      status: {
        in: ['DELIVERED', 'LOCKED_AFTER_CUTOFF'],
      },
      // Solo pedidos de los últimos 7 días
      serviceDate: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      id: true,
      serviceDate: true,
      selection: true,
      price: true,
      status: true,
    },
    orderBy: {
      serviceDate: 'desc',
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis Incidencias</h1>
          <p className="text-gray-600 mt-1">
            Consulta el estado de tus reportes y notifica cualquier problema
          </p>
        </div>
        <ReportIncidentButton orders={recentOrders} />
      </div>

      {/* Stats */}
      <IncidentsStats stats={stats} />

      {/* Lista de incidencias */}
      <IncidentsList incidents={incidents} />
    </div>
  )
}

