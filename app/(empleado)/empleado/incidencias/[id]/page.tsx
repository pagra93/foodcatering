import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getIncidentDetail } from '@/lib/db/queries/empleado-incidencias'
import { getThreadMessages } from '@/lib/db/queries/activity'
import { ActivityThread } from '@/components/shared/activity/ActivityThread'
import { incidentDisplayName } from '@/lib/incidents/constants'

export default async function EmpleadoIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params

  const employee = await prisma.employee.findFirst({
    where: {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      status: 'ACTIVE',
    },
    select: { id: true },
  })
  if (!employee) notFound()

  let incident
  try {
    incident = await getIncidentDetail(id, employee.id)
  } catch {
    notFound()
  }

  const thread = await getThreadMessages('INCIDENT', id, false)
  const displayName = incidentDisplayName({
    subject: incident.subject,
    reasonName: incident.reasonName,
    type: incident.type,
  })
  const selection = (incident.order?.selection ?? null) as
    | { first?: { name?: string } | null }
    | null
  const firstDish = selection?.first?.name ?? null

  const resolution =
    incident.resolution &&
    typeof incident.resolution === 'object' &&
    !Array.isArray(incident.resolution)
      ? (incident.resolution as Record<string, unknown>)
      : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/empleado/incidencias">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a mis incidencias
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{incident.typeIcon}</span>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <Badge variant="outline">{incident.statusLabel}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {incident.typeLabel}
            {incident.order?.serviceDate && (
              <>
                {' · '}
                Pedido del{' '}
                {format(new Date(incident.order.serviceDate), "d 'de' MMMM", {
                  locale: es,
                })}
              </>
            )}
            {' · '}
            Reportada el{' '}
            {format(new Date(incident.createdAt), 'd MMM yyyy', { locale: es })}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Severidad</p>
          <p className="mt-1 font-medium">{incident.severityLabel}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Plato</p>
          <p className="mt-1 font-medium">
            {firstDish ?? <span className="text-gray-400">—</span>}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Descripción</p>
          <p className="mt-1 text-sm text-gray-700">
            {incident.description || <span className="text-gray-400">—</span>}
          </p>
        </Card>
      </div>

      {resolution && (
        <Card className="border-green-200 bg-green-50 p-4">
          <h3 className="font-medium text-green-900">Respuesta del catering</h3>
          <p className="mt-1 text-sm text-green-800">
            {String(resolution['details'] ?? resolution['type'] ?? '')}
          </p>
        </Card>
      )}

      <ActivityThread
        entity="INCIDENT"
        entityId={incident.id}
        messages={thread}
        canPostInternal={false}
      />
    </div>
  )
}
