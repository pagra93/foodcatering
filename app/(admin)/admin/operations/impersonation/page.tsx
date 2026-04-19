import Link from 'next/link'
import { ArrowLeft, ShieldCheck, UserCog } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getImpersonationHistory } from '@/lib/db/queries/admin-operations'

export default async function ImpersonationHistoryPage() {
  const history = await getImpersonationHistory(100)

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
        <h1 className="text-2xl font-bold">Historial de Impersonaciones</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Cada inicio de sesión impersonada queda auditado. Útil para
          detectar abusos, ayudar a un cliente que nos diga "alguien ha
          tocado mis datos" o simplemente tener trazabilidad para el DPO.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Total registros: <strong>{history.length}</strong>
          {history[0] && (
            <>
              <span>·</span>
              <span>
                Último:{' '}
                {formatDistanceToNow(history[0].timestamp, {
                  locale: es,
                  addSuffix: true,
                })}
              </span>
            </>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Cuándo</th>
              <th className="px-4 py-3 text-left">Super admin</th>
              <th className="px-4 py-3 text-left">Usuario impersonado</th>
              <th className="px-4 py-3 text-left">Tenant destino</th>
              <th className="px-4 py-3 text-left">IP</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-600">
                  <div>
                    {format(h.timestamp, 'dd MMM yyyy HH:mm:ss', { locale: es })}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {formatDistanceToNow(h.timestamp, {
                      locale: es,
                      addSuffix: true,
                    })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {h.actor ? (
                    <div>
                      <div className="font-medium">{h.actor.name}</div>
                      <div className="text-xs text-gray-500">
                        {h.actor.email}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {h.target ? (
                    <div>
                      <div className="font-medium">{h.target.name}</div>
                      <div className="text-xs text-gray-500">
                        {h.target.email}
                      </div>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {h.target.role}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-gray-400">
                      <UserCog className="inline h-3 w-3 mr-1" />
                      usuario borrado
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {h.target?.tenant ? (
                    <div>
                      <div>{h.target.tenant.name}</div>
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {h.target.tenant.type}
                      </Badge>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-gray-500">
                  {h.ip ?? '—'}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay impersonaciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
