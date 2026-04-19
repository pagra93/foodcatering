'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, Eraser, FileText, Shield } from 'lucide-react'
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
  ACCESS: 'Acceso a datos',
  ERASURE: 'Derecho al olvido',
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

export function EmpleadoGdprSection({
  employeeName,
  userId,
  existing,
}: {
  employeeName: string
  userId: string
  existing: ExistingRequest[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const create = (type: GdprRequestType) => {
    const mensajes: Record<GdprRequestType, string> = {
      ACCESS: `Se abrirá una solicitud de Acceso a Datos RGPD en nombre de ${employeeName}. SinTupper generará un dump JSON con sus datos personales y se lo hará llegar en un plazo máximo de 30 días. ¿Continuar?`,
      PORTABILITY: `Se abrirá una solicitud de Portabilidad RGPD en nombre de ${employeeName}. Genera un JSON estructurado transferible a otra plataforma. ¿Continuar?`,
      ERASURE: `⚠️ Se abrirá una solicitud de Derecho al Olvido. Si SinTupper la resuelve, los datos personales de ${employeeName} serán anonimizados de forma IRREVERSIBLE (nombre, email, teléfono). Los pedidos históricos se conservan por obligación fiscal pero quedan desvinculados. ¿Continuar?`,
      RECTIFICATION: `Se abrirá una solicitud de Rectificación RGPD en nombre de ${employeeName}. Incluye en las notas qué datos son incorrectos. ¿Continuar?`,
    }
    if (!confirm(mensajes[type])) return

    startTransition(async () => {
      try {
        await createGdprRequestAction({ userId, type })
        toast.success('Solicitud registrada. SinTupper la gestionará.')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-blue-600" />
        <h3 className="text-base font-semibold">Derechos RGPD</h3>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        Abre solicitudes RGPD en nombre de {employeeName}. SinTupper las
        ejecuta y responde en un plazo legal de 30 días. Todas las
        operaciones quedan auditadas.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <GdprButton
          icon={Download}
          iconColor="text-blue-600"
          title="Solicitar acceso a datos"
          description="Obtiene un JSON con todos los datos personales del empleado."
          onClick={() => create('ACCESS')}
          disabled={isPending}
        />
        <GdprButton
          icon={FileText}
          iconColor="text-emerald-600"
          title="Solicitar portabilidad"
          description="JSON estructurado transferible a otro sistema."
          onClick={() => create('PORTABILITY')}
          disabled={isPending}
        />
        <GdprButton
          icon={FileText}
          iconColor="text-amber-600"
          title="Solicitar rectificación"
          description="Corregir datos personales erróneos."
          onClick={() => create('RECTIFICATION')}
          disabled={isPending}
        />
        <GdprButton
          icon={Eraser}
          iconColor="text-red-600"
          title="Derecho al olvido"
          description="Anonimización irreversible. Pedidos se conservan (fiscal)."
          onClick={() => create('ERASURE')}
          disabled={isPending}
          destructive
        />
      </div>

      {existing.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h4 className="mb-2 text-sm font-medium">Solicitudes previas</h4>
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

function GdprButton({
  icon: Icon,
  iconColor,
  title,
  description,
  onClick,
  disabled,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  description: string
  onClick: () => void
  disabled: boolean
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex items-start gap-3 rounded-md border p-4 text-left transition-colors ${
        destructive
          ? 'border-red-200 hover:bg-red-50'
          : 'border-gray-200 hover:bg-gray-50'
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <Icon className={`mt-0.5 h-4 w-4 ${iconColor}`} />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-gray-600">{description}</p>
      </div>
    </button>
  )
}
