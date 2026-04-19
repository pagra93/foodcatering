import Link from 'next/link'
import { ArrowLeft, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ALL_RATE_LIMITERS } from '@/lib/ratelimit'
import { ResetLimiterKeyButton } from '@/components/admin/operations/rate-limiting/ResetButton'

export const dynamic = 'force-dynamic'

const LIMITER_DESCRIPTIONS: Record<string, string> = {
  auth: 'Intentos de login por IP. Protege contra brute-force.',
  impersonation: 'Impersonaciones por super admin. Previene abuso del poder.',
  export: 'Exports CSV/ERP por tenant. Evita saturación del servidor.',
}

export default async function RateLimitingPage() {
  const sections = Object.entries(ALL_RATE_LIMITERS).map(([name, limiter]) => ({
    name,
    config: limiter.config,
    entries: limiter.inspect(),
  }))

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
        <h1 className="text-2xl font-bold">Rate Limiting</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Estado en vivo de los 3 rate limiters activos. Si un usuario queda
          bloqueado por error (typo de password repetido, etc.), puedes
          resetear su ventana manualmente. El estado es <strong>in-memory</strong>{' '}
          — se pierde al reiniciar el proceso Node.
        </p>
      </div>

      {sections.map((s) => (
        <Card key={s.name} className="overflow-hidden">
          <div className="flex items-center justify-between border-b bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <Gauge className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="font-semibold capitalize">{s.name}</h3>
                <p className="text-xs text-gray-600">
                  {LIMITER_DESCRIPTIONS[s.name]}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div>
                Límite:{' '}
                <strong>
                  {s.config.limit} / {s.config.windowSeconds}s
                </strong>
              </div>
              <Badge variant="outline" className="mt-1">
                {s.entries.length} ventanas activas
              </Badge>
            </div>
          </div>

          {s.entries.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              Sin actividad reciente.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Key</th>
                  <th className="px-4 py-2 text-right">Uso</th>
                  <th className="px-4 py-2 text-right">Reset en</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {s.entries.map((e) => (
                  <tr
                    key={e.key}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 font-mono text-xs">{e.key}</td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={
                          e.blocked ? 'font-semibold text-red-600' : ''
                        }
                      >
                        {e.count} / {e.limit}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-gray-600">
                      {e.resetIn}s
                    </td>
                    <td className="px-4 py-2">
                      {e.blocked ? (
                        <Badge variant="destructive">Bloqueado</Badge>
                      ) : (
                        <Badge variant="outline">OK</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ResetLimiterKeyButton
                        limiter={s.name}
                        limiterKey={e.key}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ))}

      <Card className="bg-gray-50/60 p-4 text-xs text-gray-600">
        <p>
          <strong>Nota:</strong> el estado es{' '}
          <code>Map&lt;string, Bucket&gt;</code> en memoria. Se reinicia al
          redeployar. Para escalar a multi-réplica hay que mover a Upstash
          Redis (Sprint 6 Integraciones).
        </p>
      </Card>
    </div>
  )
}
