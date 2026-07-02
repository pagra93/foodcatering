import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { PenaltyStatus, PenaltyType } from '@prisma/client'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getOwnPenaltyById } from '@/lib/db/queries/catering-calidad'
import { getThreadMessages } from '@/lib/db/queries/activity'
import { ActivityThread } from '@/components/shared/activity/ActivityThread'
import { DisputePenaltyButton } from '@/components/catering/calidad/DisputePenaltyButton'

const STATUS_META: Record<
  PenaltyStatus,
  { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }
> = {
  PENDING: { label: 'En revisión', variant: 'secondary' },
  APPLIED: { label: 'Aplicada', variant: 'destructive' },
  DISPUTED: { label: 'En disputa', variant: 'outline' },
  WAIVED: { label: 'Perdonada', variant: 'default' },
}

const TYPE_LABEL: Record<PenaltyType, string> = {
  SLA_BREACH: 'SLA incumplido',
  DOC_EXPIRED: 'Documentación caducada',
  INCIDENT_THRESHOLD: 'Umbral de incidencias',
  MANUAL: 'Manual',
}

const DISPUTE_WINDOW_DAYS = 7

export default async function CateringPenaltyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.tenantType !== 'CATERING') redirect('/unauthorized')

  const { id } = await params
  const penalty = await getOwnPenaltyById(id, session.user.tenantId)
  if (!penalty) notFound()

  const thread = await getThreadMessages('PENALTY', id, false)
  const amount = Number(penalty.amount)

  const canDispute =
    penalty.status === 'APPLIED' &&
    penalty.settledAt != null &&
    Date.now() - new Date(penalty.settledAt).getTime() <
      DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/catering/calidad">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Calidad
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Penalización</h1>
            <Badge variant="outline">{TYPE_LABEL[penalty.type]}</Badge>
            <Badge variant={STATUS_META[penalty.status].variant}>
              {STATUS_META[penalty.status].label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {format(penalty.appliedAt, "d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-gray-500">Importe</p>
          <p className="text-3xl font-bold text-red-600">{amount.toFixed(2)} €</p>
        </div>
      </div>

      <Card className="space-y-3 p-6">
        <div>
          <p className="text-xs uppercase text-gray-500">Motivo</p>
          <p className="mt-1 text-sm text-gray-800">{penalty.reason}</p>
        </div>
        {penalty.disputeReason && (
          <div className="rounded-md bg-amber-50 p-3">
            <p className="text-xs font-medium uppercase text-amber-700">Tu disputa</p>
            <p className="mt-1 text-sm text-amber-900">{penalty.disputeReason}</p>
          </div>
        )}
        {canDispute ? (
          <div className="border-t pt-3">
            <p className="mb-2 text-sm text-gray-600">
              Puedes disputar esta penalización (plazo de {DISPUTE_WINDOW_DAYS} días
              desde que se aplicó). Explica por qué no procede.
            </p>
            <DisputePenaltyButton penaltyId={penalty.id} />
          </div>
        ) : penalty.status === 'APPLIED' ? (
          <p className="border-t pt-3 text-sm text-gray-400">
            El plazo para disputar esta penalización ha expirado.
          </p>
        ) : null}
      </Card>

      <ActivityThread
        entity="PENALTY"
        entityId={penalty.id}
        messages={thread}
        canPostInternal={false}
      />
    </div>
  )
}
