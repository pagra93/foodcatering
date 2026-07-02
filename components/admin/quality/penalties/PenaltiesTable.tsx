'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, X } from 'lucide-react'
import type { PenaltyStatus, PenaltyType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { applyPenaltyAction, waivePenaltyAction } from './actions'

type Row = {
  id: string
  type: PenaltyType
  status: PenaltyStatus
  reason: string
  amount: string // Decimal serializado
  appliedAt: Date
  disputedAt: Date | null
  disputeReason: string | null
  catering: { id: string; name: string; subdomain: string } | null
}

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

export function PenaltiesTable({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const apply = (p: Row) => {
    if (
      !confirm(
        `¿Aplicar penalización de ${p.amount}€ a ${p.catering?.name}? Se descontará en la liquidación.`
      )
    )
      return
    startTransition(async () => {
      try {
        await applyPenaltyAction({ penaltyId: p.id })
        toast.success('Penalización aplicada')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const waive = (p: Row) => {
    const reason = prompt('Motivo para perdonar la penalización:')
    if (!reason || reason.length < 5) return
    startTransition(async () => {
      try {
        await waivePenaltyAction({ penaltyId: p.id, reason })
        toast.success('Penalización perdonada')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Catering</th>
            <th className="px-4 py-3 text-left">Tipo</th>
            <th className="px-4 py-3 text-left">Motivo</th>
            <th className="px-4 py-3 text-right">Importe</th>
            <th className="px-4 py-3 text-left">Estado</th>
            <th className="px-4 py-3 text-left">Fecha</th>
            <th className="px-4 py-3 text-right">Acciones</th>
            <th className="px-4 py-3 text-right">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-medium">{p.catering?.name ?? '—'}</div>
                <div className="font-mono text-[10px] text-gray-500">
                  {p.catering?.subdomain}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="text-[10px]">
                  {TYPE_LABEL[p.type]}
                </Badge>
              </td>
              <td className="max-w-[280px] px-4 py-3 text-gray-600">
                <div className="truncate" title={p.reason}>
                  {p.reason}
                </div>
                {p.status === 'DISPUTED' && p.disputeReason && (
                  <div
                    className="mt-1 truncate text-[11px] text-amber-700"
                    title={p.disputeReason}
                  >
                    Disputa: {p.disputeReason}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right font-semibold">
                {Number(p.amount).toFixed(2)} €
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_META[p.status].variant}>
                  {STATUS_META[p.status].label}
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {format(p.appliedAt, 'dd MMM yyyy', { locale: es })}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  {(p.status === 'PENDING' || p.status === 'DISPUTED') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => apply(p)}
                      disabled={isPending}
                      title="Aplicar"
                    >
                      <Check className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                  {p.status !== 'WAIVED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => waive(p)}
                      disabled={isPending}
                      title="Perdonar"
                    >
                      <X className="h-4 w-4 text-emerald-600" />
                    </Button>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/quality/penalties/${p.id}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Ver detalle
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-4 py-12 text-center text-sm text-gray-500"
              >
                No hay penalizaciones registradas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  )
}
