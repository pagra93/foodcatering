import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getIncidentDetail } from '@/lib/db/queries/catering-incidencias'
import { getThreadMessages } from '@/lib/db/queries/activity'
import { ActivityThread } from '@/components/shared/activity/ActivityThread'
import { IncidentResolveInline } from '@/components/catering/incidencias/IncidentResolveInline'

export default async function CateringIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.tenantType !== 'CATERING') redirect('/unauthorized')

  const { id } = await params

  let incident
  try {
    incident = await getIncidentDetail(id, session.user.tenantId)
  } catch {
    notFound()
  }

  const thread = await getThreadMessages('INCIDENT', id, false)
  const isOpen = incident.status === 'OPEN' || incident.status === 'IN_PROGRESS'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/catering/incidencias">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Incidencias
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{incident.typeIcon}</span>
            <h1 className="text-2xl font-bold">{incident.typeLabel}</h1>
            <Badge variant="outline">{incident.statusLabel}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {incident.companyName} · {incident.employeeName} ·{' '}
            {format(new Date(incident.createdAt), "d MMM yyyy", { locale: es })}
          </p>
        </div>
        {isOpen && <IncidentResolveInline incident={incident} />}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Severidad</p>
          <p className="mt-1 font-medium">{incident.severityLabel}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Empresa</p>
          <p className="mt-1 font-medium">{incident.companyName}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Descripción</p>
          <p className="mt-1 text-sm text-gray-700">
            {incident.description || <span className="text-gray-400">—</span>}
          </p>
        </Card>
      </div>

      <ActivityThread
        entity="INCIDENT"
        entityId={incident.id}
        messages={thread}
        canPostInternal={false}
      />
    </div>
  )
}
