import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Database,
  Gauge,
  HeartPulse,
  HistoryIcon,
  ShieldAlert,
  UserCog,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getActiveMaintenanceWindow,
  getBackupKPIs,
} from '@/lib/db/queries/admin-operations'

export default async function OperationsPage() {
  const [backupKpis, maintenance] = await Promise.all([
    getBackupKPIs(),
    getActiveMaintenanceWindow(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operación</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Herramientas internas para el día a día del equipo Plati:
          trazabilidad de impersonaciones, estado de backups y migraciones,
          ventanas de mantenimiento, health checks y visibilidad del rate
          limiter.
        </p>
      </div>

      {(maintenance || backupKpis.stale) && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="flex-1 text-sm text-amber-900">
              {maintenance && (
                <p>
                  <strong>Mantenimiento activo:</strong> {maintenance.reason} ·
                  hasta {maintenance.endsAt.toLocaleString('es-ES')}
                </p>
              )}
              {backupKpis.stale && (
                <p className={maintenance ? 'mt-1' : ''}>
                  <strong>Alerta backup:</strong> último registrado hace{' '}
                  {backupKpis.hoursSinceLast}h (&gt;25h umbral). Revisa cron.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <SubModule
          href="/admin/operations/impersonation"
          icon={UserCog}
          iconColor="text-primary"
          title="Historial de Impersonaciones"
          description="Trazabilidad auditada: qué super admin ha actuado como qué usuario y cuándo."
        />
        <SubModule
          href="/admin/operations/backups"
          icon={Database}
          iconColor="text-primary"
          title="Backups"
          description="Registro de pg_dumps de comidas_prod. El cron escribe cada noche."
          badge={
            backupKpis.total === 0
              ? 'sin registros'
              : `${backupKpis.last7d} últimos 7d`
          }
          badgeVariant={backupKpis.stale ? 'destructive' : 'outline'}
        />
        <SubModule
          href="/admin/operations/migrations"
          icon={HistoryIcon}
          iconColor="text-emerald-600"
          title="Migraciones"
          description="Estado de prisma_migrations en producción."
        />
        <SubModule
          href="/admin/operations/maintenance"
          icon={ShieldAlert}
          iconColor="text-red-600"
          title="Modo Mantenimiento"
          description="Programa ventanas con mensaje custom. Super admin siempre pasa."
          badge={maintenance ? 'ACTIVO' : undefined}
          badgeVariant={maintenance ? 'destructive' : undefined}
        />
        <SubModule
          href="/admin/operations/health"
          icon={HeartPulse}
          iconColor="text-pink-600"
          title="Health Checks"
          description="BD, backups, memoria, uptime. Pasa por aquí al investigar problemas."
        />
        <SubModule
          href="/admin/operations/rate-limiting"
          icon={Gauge}
          iconColor="text-amber-600"
          title="Rate Limiting"
          description="Ventanas activas de auth/impersonation/export. Reset manual si un usuario queda bloqueado por error."
        />
      </div>

      <Card className="bg-gray-50/60 p-4 text-xs text-gray-600">
        <div className="flex items-start gap-2">
          <Activity className="mt-0.5 h-4 w-4 text-gray-500" />
          <p>
            Este panel es exclusivo del equipo Plati (SUPER_ADMIN /
            AUDITOR). Los usuarios de empresa/catering nunca lo ven. Todas las
            acciones realizadas desde aquí quedan auditadas en{' '}
            <code>audit_logs</code>.
          </p>
        </div>
      </Card>
    </div>
  )
}

function SubModule({
  href,
  icon: Icon,
  iconColor,
  title,
  description,
  badge,
  badgeVariant = 'outline',
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  description: string
  badge?: string
  badgeVariant?: 'outline' | 'default' | 'destructive'
}) {
  return (
    <Link href={href} className="group">
      <Card className="p-5 transition-colors group-hover:bg-gray-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${iconColor}`} />
              <h3 className="font-semibold">{title}</h3>
              {badge && (
                <Badge variant={badgeVariant} className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  )
}
