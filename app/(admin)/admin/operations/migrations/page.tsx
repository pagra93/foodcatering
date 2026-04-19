import Link from 'next/link'
import { ArrowLeft, CheckCircle, Clock, XCircle } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getPrismaMigrations } from '@/lib/db/queries/admin-operations'

export default async function MigrationsPage() {
  let migrations: Awaited<ReturnType<typeof getPrismaMigrations>> = []
  let errorMsg: string | null = null
  try {
    migrations = await getPrismaMigrations()
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Error consultando _prisma_migrations'
  }

  const applied = migrations.filter((m) => m.finished_at && !m.rolled_back_at)
  const rolledBack = migrations.filter((m) => m.rolled_back_at)
  const unfinished = migrations.filter(
    (m) => !m.finished_at && !m.rolled_back_at
  )

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
        <h1 className="text-2xl font-bold">Migraciones Prisma</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Registro tal como Prisma lo guarda en{' '}
          <code>_prisma_migrations</code>. Idéntico a lo que ves con{' '}
          <code>prisma migrate status</code> en la terminal.
        </p>
      </div>

      {errorMsg && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {errorMsg}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Aplicadas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {applied.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Con rollback</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {rolledBack.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Sin finalizar</p>
          <p
            className={`mt-1 text-2xl font-bold ${unfinished.length > 0 ? 'text-red-600' : 'text-gray-400'}`}
          >
            {unfinished.length}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Migración</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Empezada</th>
              <th className="px-4 py-3 text-left">Finalizada</th>
              <th className="px-4 py-3 text-right">Pasos</th>
              <th className="px-4 py-3 text-left">Checksum</th>
            </tr>
          </thead>
          <tbody>
            {migrations.map((m) => {
              const done = m.finished_at && !m.rolled_back_at
              return (
                <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">
                    {m.migration_name}
                  </td>
                  <td className="px-4 py-3">
                    {done && (
                      <Badge
                        variant="default"
                        className="inline-flex items-center gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Aplicada
                      </Badge>
                    )}
                    {m.rolled_back_at && (
                      <Badge variant="destructive" className="inline-flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Rollback
                      </Badge>
                    )}
                    {!m.finished_at && !m.rolled_back_at && (
                      <Badge variant="outline" className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        En curso
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {format(m.started_at, 'dd MMM HH:mm', { locale: es })}
                    <div className="text-[10px] text-gray-400">
                      {formatDistanceToNow(m.started_at, {
                        locale: es,
                        addSuffix: true,
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {m.finished_at
                      ? format(m.finished_at, 'dd MMM HH:mm', { locale: es })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {m.applied_steps_count}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-500">
                    {m.checksum.slice(0, 10)}…
                  </td>
                </tr>
              )
            })}
            {migrations.length === 0 && !errorMsg && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  Sin migraciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
