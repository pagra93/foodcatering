'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, Eraser, Lock } from 'lucide-react'
import type { GdprRequestStatus, GdprRequestType } from '@prisma/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createGdprRequestAction } from '@/components/admin/compliance/gdpr/actions'

type ExistingRequest = {
  id: string
  type: GdprRequestType
  status: GdprRequestStatus
  requestedAt: Date
  resolvedAt: Date | null
}

const TYPE_LABEL: Record<GdprRequestType, string> = {
  ACCESS: 'Acceso',
  ERASURE: 'Olvido',
  PORTABILITY: 'Portabilidad',
  RECTIFICATION: 'Rectificación',
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

export function PrivacySection({
  userId,
  existing,
}: {
  userId: string
  existing: ExistingRequest[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const openAccessRequest = () => {
    if (
      !confirm(
        'Se abrirá una solicitud de Acceso a tus Datos. SinTupper te entregará un JSON con tus datos personales (perfil, pedidos, valoraciones, incidencias) en un plazo máximo de 30 días. ¿Continuar?'
      )
    )
      return
    startTransition(async () => {
      try {
        await createGdprRequestAction({ userId, type: 'ACCESS' })
        toast.success('Solicitud registrada. Recibirás tus datos en breve.')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const openErasureRequest = () => {
    if (
      !confirm(
        '⚠️ Derecho al Olvido\n\nAl ejercer este derecho, SinTupper anonimizará tus datos personales (nombre, email, teléfono) de forma IRREVERSIBLE. Tus pedidos históricos se conservarán durante 5 años por obligación fiscal, pero quedarán desvinculados de ti.\n\nEsto incluye:\n• Tu cuenta quedará deshabilitada\n• No podrás hacer login\n• No podrás pedir menús\n\n¿Estás seguro?'
      )
    )
      return
    startTransition(async () => {
      try {
        await createGdprRequestAction({ userId, type: 'ERASURE' })
        toast.success(
          'Solicitud registrada. SinTupper la revisará y ejecutará en 30 días máx.'
        )
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Lock className="h-5 w-5 text-blue-600" />
        <h3 className="text-base font-semibold">Privacidad y Datos</h3>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        Tus derechos RGPD sobre los datos personales que SinTupper guarda
        sobre ti. El plazo legal de respuesta es de <strong>30 días</strong>.
        Las solicitudes quedan registradas y puedes seguir su estado aquí.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={openAccessRequest}
          disabled={isPending}
          className="flex items-start gap-3 rounded-md border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="mt-0.5 h-4 w-4 text-blue-600" />
          <div>
            <p className="text-sm font-semibold">Descargar mis datos</p>
            <p className="mt-0.5 text-xs text-gray-600">
              Recibe un JSON con tu perfil, pedidos, valoraciones e
              incidencias.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={openErasureRequest}
          disabled={isPending}
          className="flex items-start gap-3 rounded-md border border-red-200 p-4 text-left transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Eraser className="mt-0.5 h-4 w-4 text-red-600" />
          <div>
            <p className="text-sm font-semibold">Eliminar mi cuenta</p>
            <p className="mt-0.5 text-xs text-gray-600">
              Derecho al olvido RGPD. Anonimización irreversible de datos
              personales.
            </p>
          </div>
        </button>
      </div>

      {existing.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h4 className="mb-2 text-sm font-medium">Mis solicitudes</h4>
          <ul className="space-y-2">
            {existing.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {TYPE_LABEL[r.type]}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {format(r.requestedAt, 'dd MMM yyyy', { locale: es })}
                  </span>
                </span>
                <Badge variant={STATUS_META[r.status].variant}>
                  {STATUS_META[r.status].label}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
