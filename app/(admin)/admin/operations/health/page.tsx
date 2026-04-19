import Link from 'next/link'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { runHealthChecks } from '@/lib/db/queries/admin-operations'

// Forzar recálculo en cada visita.
export const dynamic = 'force-dynamic'

const STATUS_META: Record<
  'OK' | 'WARN' | 'FAIL',
  { icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  OK: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    label: 'OK',
  },
  WARN: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    label: 'AVISO',
  },
  FAIL: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    label: 'FALLO',
  },
}

export default async function HealthPage() {
  const { results, totalMs } = await runHealthChecks()
  const overall = results.some((r) => r.status === 'FAIL')
    ? 'FAIL'
    : results.some((r) => r.status === 'WARN')
      ? 'WARN'
      : 'OK'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/operations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Operación
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Health Checks</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Snapshot en vivo del estado del sistema. Se recalcula cada vez
          que entras en esta página.
        </p>
      </div>

      <Card className={`p-5 ${STATUS_META[overall].bg}`}>
        <div className="flex items-center gap-3">
          <HeartPulse className={`h-6 w-6 ${STATUS_META[overall].color}`} />
          <div>
            <p className={`text-lg font-semibold ${STATUS_META[overall].color}`}>
              {overall === 'OK' && 'Todos los checks pasan'}
              {overall === 'WARN' && 'Hay avisos que revisar'}
              {overall === 'FAIL' && 'Hay fallos críticos'}
            </p>
            <p className="text-xs text-gray-500">
              Verificación completada en {totalMs}ms
            </p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" asChild>
            <Link href="/admin/operations/health">
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Refrescar
            </Link>
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        {results.map((r) => {
          const meta = STATUS_META[r.status]
          const Icon = meta.icon
          return (
            <Card key={r.name} className="p-4">
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-5 w-5 ${meta.color}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{r.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{r.detail}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="bg-gray-50/60 p-4 text-xs text-gray-600">
        <p>
          <strong>¿Faltan checks?</strong> Extiende{' '}
          <code>runHealthChecks()</code> en{' '}
          <code>lib/db/queries/admin-operations.ts</code> para añadir
          disk space, latencia a Coolify, integraciones externas, etc.
        </p>
      </Card>
    </div>
  )
}
