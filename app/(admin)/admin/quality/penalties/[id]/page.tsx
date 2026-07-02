import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2, FileWarning, ClipboardCheck } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { PenaltyStatus, PenaltyType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getRequiredSession } from '@/lib/auth/session'
import { getPenaltyById } from '@/lib/db/queries/admin-penalties'
import { getThreadMessages } from '@/lib/db/queries/activity'
import { PenaltyDetailActions } from '@/components/admin/quality/penalties/PenaltyDetailActions'
import { ActivityThread } from '@/components/shared/activity/ActivityThread'

const STATUS_META: Record<
  PenaltyStatus,
  { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }
> = {
  PENDING: { label: 'Pendiente', variant: 'secondary' },
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

type TimelineEntry = { at: Date; label: string; detail?: string | null }

export default async function PenaltyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await getRequiredSession()
  const { id } = await params
  const penalty = await getPenaltyById(id)
  if (!penalty) notFound()

  const amount = Number(penalty.amount)
  const messages = await getThreadMessages('PENALTY', id, true)

  // Timeline del ciclo de vida, derivado de los campos existentes.
  const timeline: TimelineEntry[] = [
    { at: penalty.createdAt, label: 'Penalización registrada', detail: penalty.reason },
  ]
  if (penalty.settledAt) {
    timeline.push({ at: penalty.settledAt, label: 'Aplicada (se descuenta en liquidación)' })
  }
  if (penalty.disputedAt) {
    timeline.push({
      at: penalty.disputedAt,
      label: 'Disputada por el catering',
      detail: penalty.disputeReason,
    })
  }
  if (penalty.resolvedAt) {
    timeline.push({
      at: penalty.resolvedAt,
      label:
        penalty.status === 'WAIVED'
          ? 'Resuelta: perdonada'
          : 'Resuelta: se mantiene aplicada',
    })
  }
  timeline.sort((a, b) => a.at.getTime() - b.at.getTime())

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/quality/penalties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Penalizaciones
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
            {format(penalty.createdAt, "d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-gray-500">Importe</p>
          <p className="text-3xl font-bold text-red-600">{amount.toFixed(2)} €</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Catering</p>
          {penalty.catering ? (
            <Link
              href={`/admin/caterings/${penalty.catering.id}`}
              className="mt-1 inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
            >
              <Building2 className="h-4 w-4" />
              {penalty.catering.name}
            </Link>
          ) : (
            <p className="mt-1 font-medium text-gray-400">—</p>
          )}
          {penalty.catering?.subdomain && (
            <p className="font-mono text-[10px] text-gray-500">
              {penalty.catering.subdomain}
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Origen</p>
          {penalty.linkedIncidentId ? (
            <Link
              href={`/admin/incidents/${penalty.linkedIncidentId}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <FileWarning className="h-4 w-4" />
              Incidencia vinculada
            </Link>
          ) : penalty.linkedAuditId ? (
            <Link
              href={`/admin/quality/audits/${penalty.linkedAuditId}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ClipboardCheck className="h-4 w-4" />
              Auditoría vinculada
            </Link>
          ) : (
            <p className="mt-1 text-sm text-gray-500">Manual (sin origen vinculado)</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Notas internas</p>
          <p className="mt-1 text-sm text-gray-700">
            {penalty.notes || <span className="text-gray-400">Sin notas</span>}
          </p>
        </Card>
      </div>

      {/* Motivo + disputa */}
      <Card className="space-y-3 p-6">
        <div>
          <p className="text-xs uppercase text-gray-500">Motivo (visible al catering)</p>
          <p className="mt-1 text-sm text-gray-800">{penalty.reason}</p>
        </div>
        {penalty.disputeReason && (
          <div className="rounded-md bg-amber-50 p-3">
            <p className="text-xs font-medium uppercase text-amber-700">
              Disputa del catering
            </p>
            <p className="mt-1 text-sm text-amber-900">{penalty.disputeReason}</p>
          </div>
        )}
      </Card>

      {/* Timeline */}
      <Card className="p-6">
        <h3 className="mb-4 text-base font-semibold">Historial</h3>
        <ol className="space-y-4">
          {timeline.map((e, i) => (
            <li key={i} className="flex gap-3">
              <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-medium text-gray-900">{e.label}</p>
                <p className="text-xs text-gray-500">
                  {format(e.at, "d MMM yyyy · HH:mm", { locale: es })}
                </p>
                {e.detail && (
                  <p className="mt-0.5 text-sm text-gray-600">{e.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* Acciones */}
      <Card className="p-6">
        <h3 className="mb-3 text-base font-semibold">Acciones</h3>
        <PenaltyDetailActions
          penaltyId={penalty.id}
          status={penalty.status}
          amount={amount}
          cateringName={penalty.catering?.name ?? 'este catering'}
        />
      </Card>

      <ActivityThread
        entity="PENALTY"
        entityId={penalty.id}
        messages={messages}
        canPostInternal
      />
    </div>
  )
}
