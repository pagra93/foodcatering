import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCateringIncidents, getCateringIncidentStats } from '@/lib/db/queries/catering-incidencias'
import { CateringIncidentsStats } from '@/components/catering/incidencias/CateringIncidentsStats'
import { CateringIncidentsList } from '@/components/catering/incidencias/CateringIncidentsList'
import { CateringIncidentsFilters } from '@/components/catering/incidencias/CateringIncidentsFilters'

export const metadata = {
  title: 'Incidencias | Portal Catering',
  description: 'Gestiona y responde a las incidencias reportadas por tus clientes',
}

type PageProps = {
  searchParams: {
    status?: string
    type?: string
    severity?: string
  }
}

export default async function CateringIncidenciasPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session || !session.user) {
    redirect('/login')
  }

  // Obtener stats e incidencias
  const [stats, incidents] = await Promise.all([
    getCateringIncidentStats(session.user.tenantId),
    getCateringIncidents(session.user.tenantId, {
      status: searchParams.status,
      type: searchParams.type,
      severity: searchParams.severity,
    }),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gestión de Incidencias</h1>
        <p className="text-gray-600 mt-1">
          Revisa y responde a los reportes de tus clientes
        </p>
      </div>

      {/* Stats */}
      <CateringIncidentsStats stats={stats} />

      {/* Filtros */}
      <CateringIncidentsFilters />

      {/* Lista de incidencias */}
      <CateringIncidentsList incidents={incidents} />
    </div>
  )
}

