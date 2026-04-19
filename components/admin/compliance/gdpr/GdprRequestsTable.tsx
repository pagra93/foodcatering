'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, Eye, X } from 'lucide-react'
import type { GdprRequestStatus, GdprRequestType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  rejectGdprRequestAction,
  resolveGdprRequestAction,
} from './actions'

type Row = {
  id: string
  type: GdprRequestType
  status: GdprRequestStatus
  requestedAt: Date
  dueBy: Date
  daysLeft: number
  resolvedAt: Date | null
  notes: string | null
  rejectionReason: string | null
  deliveryUrl: string | null
  subject: { id: string; email: string; nameEnc: string; role: string } | null
  requester: { id: string; email: string; nameEnc: string } | null
  tenant: { id: string; name: string; type: string } | null
}

const TYPE_LABEL: Record<GdprRequestType, string> = {
  ACCESS: 'Acceso',
  ERASURE: 'Olvido',
  PORTABILITY: 'Portabilidad',
  RECTIFICATION: 'Rectificación',
}

const TYPE_COLOR: Record<GdprRequestType, string> = {
  ACCESS: 'bg-blue-100 text-blue-700',
  ERASURE: 'bg-red-100 text-red-700',
  PORTABILITY: 'bg-emerald-100 text-emerald-700',
  RECTIFICATION: 'bg-amber-100 text-amber-700',
}

const STATUS_META: Record<
  GdprRequestStatus,
  { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }
> = {
  PENDING: { label: 'Pendiente', variant: 'secondary' },
  IN_PROGRESS: { label: 'En curso', variant: 'outline' },
  RESOLVED: { label: 'Resuelta', variant: 'default' },
  REJECTED: { label: 'Rechazada', variant: 'destructive' },
}

export function GdprRequestsTable({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [erasureConfirm, setErasureConfirm] = useState<{
    id: string
    text: string
  } | null>(null)

  const resolve = (r: Row) => {
    if (r.type === 'ERASURE') {
      setErasureConfirm({ id: r.id, text: '' })
      return
    }
    if (!confirm(`¿Resolver solicitud de ${TYPE_LABEL[r.type]}?`)) return

    startTransition(async () => {
      try {
        const { deliveryUrl } = await resolveGdprRequestAction({
          requestId: r.id,
        })
        toast.success('Solicitud resuelta')
        if (deliveryUrl) {
          // Descarga inmediata del JSON
          const a = document.createElement('a')
          a.href = deliveryUrl
          a.download = `gdpr-${r.type}-${r.id.slice(0, 8)}.json`
          a.click()
        }
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const confirmErasure = () => {
    if (!erasureConfirm) return
    if (erasureConfirm.text !== 'ANONIMIZAR') {
      toast.error('Debes escribir exactamente "ANONIMIZAR"')
      return
    }
    startTransition(async () => {
      try {
        await resolveGdprRequestAction({
          requestId: erasureConfirm.id,
          confirmation: 'ANONIMIZAR',
        })
        toast.success('Usuario anonimizado')
        setErasureConfirm(null)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const reject = (r: Row) => {
    const reason = prompt(
      'Motivo del rechazo (mín 10 caracteres):'
    )
    if (!reason || reason.length < 10) {
      if (reason !== null)
        toast.error('Motivo demasiado corto')
      return
    }
    startTransition(async () => {
      try {
        await rejectGdprRequestAction({ requestId: r.id, reason })
        toast.success('Solicitud rechazada')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  return (
    <>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Sujeto</th>
              <th className="px-4 py-3 text-left">Tenant</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Días restantes</th>
              <th className="px-4 py-3 text-left">Solicitada</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isOpen = r.status === 'PENDING' || r.status === 'IN_PROGRESS'
              const overdue = isOpen && r.daysLeft === 0
              return (
                <tr
                  key={r.id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {r.subject?.nameEnc ?? '—'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.subject?.email} · {r.subject?.role}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {r.tenant?.name} ({r.tenant?.type})
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[r.type]}`}
                    >
                      {TYPE_LABEL[r.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_META[r.status].variant}>
                      {STATUS_META[r.status].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {isOpen ? (
                      <span
                        className={
                          overdue
                            ? 'font-semibold text-red-600'
                            : r.daysLeft <= 5
                              ? 'font-semibold text-amber-600'
                              : 'text-gray-600'
                        }
                      >
                        {overdue ? 'VENCIDA' : `${r.daysLeft}d`}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {format(r.requestedAt, 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {r.deliveryUrl && (
                        <a
                          href={r.deliveryUrl}
                          download={`gdpr-${r.type}-${r.id.slice(0, 8)}.json`}
                          className="inline-flex items-center"
                          title="Descargar dump"
                        >
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4 text-blue-600" />
                          </Button>
                        </a>
                      )}
                      {isOpen && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resolve(r)}
                            disabled={isPending}
                            title="Resolver"
                          >
                            <Eye className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reject(r)}
                            disabled={isPending}
                            title="Rechazar"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay solicitudes RGPD.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Modal confirmación ERASURE */}
      {erasureConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setErasureConfirm(null)}
        >
          <Card
            className="w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-red-700">
              Confirmar anonimización
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Esta acción es <strong>irreversible</strong>. Los datos
              personales del usuario (nombre, email, teléfono) se reemplazan
              por hashes. Los pedidos históricos se conservan para cumplir la
              obligación fiscal de 5 años, pero quedarán disociados del
              usuario real.
            </p>
            <div>
              <Label htmlFor="erasure-confirm">
                Escribe <code className="font-mono">ANONIMIZAR</code> para
                confirmar
              </Label>
              <Input
                id="erasure-confirm"
                value={erasureConfirm.text}
                onChange={(e) =>
                  setErasureConfirm({
                    ...erasureConfirm,
                    text: e.target.value,
                  })
                }
                placeholder="ANONIMIZAR"
                className="mt-2"
                autoFocus
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setErasureConfirm(null)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmErasure}
                disabled={
                  isPending || erasureConfirm.text !== 'ANONIMIZAR'
                }
                className="bg-red-600 hover:bg-red-700"
              >
                {isPending ? 'Anonimizando…' : 'Anonimizar'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
