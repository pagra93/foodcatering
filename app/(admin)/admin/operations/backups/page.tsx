import Link from 'next/link'
import { ArrowLeft, Database, FileText, Terminal } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getBackupEvents,
  getBackupKPIs,
} from '@/lib/db/queries/admin-operations'

function formatSize(bytes: number | bigint | null): string {
  if (bytes === null) return '—'
  const n = Number(bytes)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default async function BackupsPage() {
  const [events, kpis] = await Promise.all([
    getBackupEvents(100),
    getBackupKPIs(),
  ])

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
        <h1 className="text-2xl font-bold">Backups</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Histórico de pg_dumps de <code>comidas_prod</code>. El cron
          nocturno en el servidor Hetzner escribe una fila aquí tras cada
          backup. Los archivos físicos viven en{' '}
          <code>/var/backups/comidas/</code> con retención 30 días.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total histórico</p>
          <p className="mt-1 text-2xl font-bold">{kpis.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Últimos 7 días</p>
          <p
            className={`mt-1 text-2xl font-bold ${kpis.last7d >= 7 ? 'text-emerald-600' : 'text-amber-600'}`}
          >
            {kpis.last7d}
          </p>
          <p className="mt-1 text-xs text-gray-500">esperado: 7</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Último backup</p>
          <p className={`mt-1 text-2xl font-bold ${kpis.stale ? 'text-red-600' : ''}`}>
            {kpis.hoursSinceLast !== null ? `${kpis.hoursSinceLast}h` : '—'}
          </p>
          {kpis.latestAt && (
            <p className="mt-1 text-xs text-gray-500">
              {format(kpis.latestAt, 'dd MMM HH:mm', { locale: es })}
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Estado</p>
          <p className="mt-1 text-2xl font-bold">
            {kpis.stale ? '⚠️' : '✓'}
          </p>
          <p className={`mt-1 text-xs ${kpis.stale ? 'text-red-600' : 'text-emerald-600'}`}>
            {kpis.stale ? 'Backup antiguo' : 'Al día'}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-gray-600" />
          <h3 className="text-base font-semibold">Backup manual</h3>
        </div>
        <p className="mb-3 text-sm text-gray-600">
          Por seguridad, la ejecución del pg_dump no está expuesta vía
          HTTP. Para lanzar uno manualmente, conéctate por SSH al servidor
          y ejecuta:
        </p>
        <pre className="overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
          <code>
            ssh root@5.78.124.107{'\n'}
            sudo -u postgres bash /path/to/scripts/backup-prod.sh
          </code>
        </pre>
        <p className="mt-3 text-xs text-gray-500">
          El script registrará un BackupEvent en esta tabla automáticamente
          (cuando el cron esté configurado para hacerlo).
        </p>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Archivo</th>
              <th className="px-4 py-3 text-right">Tamaño</th>
              <th className="px-4 py-3 text-left">Origen</th>
              <th className="px-4 py-3 text-left">Hash</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-600">
                  <div>{format(e.createdAt, 'dd MMM yyyy HH:mm', { locale: es })}</div>
                  <div className="text-[10px] text-gray-400">
                    {formatDistanceToNow(e.createdAt, { locale: es, addSuffix: true })}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{e.fileName}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-600">
                  {formatSize(e.fileSize)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px]">
                    {e.source}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-gray-500">
                  {e.hash ? e.hash.slice(0, 12) + '…' : '—'}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  <Database className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p>Aún no hay backups registrados.</p>
                  <p className="mt-1 text-xs">
                    Configura el cron en el servidor para que escriba aquí tras
                    cada pg_dump.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="bg-gray-50/60 p-4 text-xs text-gray-600">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 text-gray-500" />
          <div>
            <p>
              <strong>Restore:</strong> documentación completa en{' '}
              <code>docs/despliegue/RUNBOOK.md</code> (sección "Restaurar
              backup"). Nunca ejecutes restore desde esta UI — siempre SSH y
              con confirmación humana.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
