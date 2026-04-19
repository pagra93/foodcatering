import Link from 'next/link'
import {
  AlertTriangle,
  ChevronRight,
  FileCheck,
  FileText,
  Lock,
  Scale,
  Shield,
  Trash2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getComplianceDashboardKPIs } from '@/lib/db/queries/admin-compliance'

export default async function CompliancePage() {
  const kpis = await getComplianceDashboardKPIs()

  const alerts: { label: string; count: number; severity: 'red' | 'amber' }[] =
    []
  if (kpis.gdprNearDue > 0)
    alerts.push({
      label: 'Solicitudes RGPD vencen en <5 días',
      count: kpis.gdprNearDue,
      severity: 'red',
    })
  if (kpis.dpasExpiring > 0)
    alerts.push({
      label: 'DPAs caducando en <30 días',
      count: kpis.dpasExpiring,
      severity: 'amber',
    })
  if (kpis.tenantsWithoutDpa > 0)
    alerts.push({
      label: 'Tenants sin DPA vigente',
      count: kpis.tenantsWithoutDpa,
      severity: 'amber',
    })
  if (kpis.securityFailed > 0)
    alerts.push({
      label: 'Controles OWASP en estado FAILED',
      count: kpis.securityFailed,
      severity: 'red',
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compliance</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Cumplimiento legal y estándares de seguridad. Cubre 3 frentes:
          fiscal (IRPF), protección de datos (RGPD + DPAs) y seguridad
          (OWASP + pentest).
        </p>
      </div>

      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">
                Atención requerida
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-800">
                {alerts.map((a) => (
                  <li key={a.label} className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      {a.count}
                    </Badge>
                    {a.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <SubModule
          href="/admin/compliance/fiscal-audit"
          icon={Scale}
          iconColor="text-purple-600"
          title="Auditoría Fiscal"
          description="Vista cross-tenant de FiscalReport — deductibilidad IRPF por empresa, pedidos sobre límite, hash de integridad."
        />
        <SubModule
          href="/admin/compliance/retention"
          icon={Trash2}
          iconColor="text-red-600"
          title="Retención de Datos"
          description="Políticas por entidad según plazos RGPD y fiscales. Ejecución manual o automática."
          badge={
            kpis.retentionPoliciesCount === 0
              ? 'sin configurar'
              : `${kpis.retentionPoliciesCount} políticas`
          }
        />
        <SubModule
          href="/admin/compliance/gdpr"
          icon={FileCheck}
          iconColor="text-blue-600"
          title="Derechos RGPD"
          description="Acceso, rectificación, portabilidad y olvido. Plazo legal 30 días."
          badge={
            kpis.gdprPending > 0 ? `${kpis.gdprPending} activas` : 'al día'
          }
          badgeVariant={kpis.gdprPending > 0 ? 'destructive' : 'default'}
        />
        <SubModule
          href="/admin/compliance/dpa"
          icon={FileText}
          iconColor="text-emerald-600"
          title="Data Processing Agreements"
          description="Contratos RGPD Art. 28 firmados por tenant. Versionado y trazabilidad."
          badge={
            kpis.tenantsWithoutDpa > 0
              ? `${kpis.tenantsWithoutDpa} sin DPA`
              : 'todos firmados'
          }
          badgeVariant={kpis.tenantsWithoutDpa > 0 ? 'destructive' : 'default'}
        />
        <SubModule
          href="/admin/compliance/security"
          icon={Shield}
          iconColor="text-amber-600"
          title="Seguridad (OWASP)"
          description="Checklist OWASP Top 10 e informes de pentesting externos."
          badge={
            kpis.securityFailed > 0
              ? `${kpis.securityFailed} FAILED`
              : kpis.securityPending > 0
                ? `${kpis.securityPending} PENDING`
                : 'OK'
          }
          badgeVariant={kpis.securityFailed > 0 ? 'destructive' : 'outline'}
        />
      </div>

      <Card className="bg-gray-50/60 p-5">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 text-gray-500" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Gobernanza del módulo
            </h3>
            <p className="mt-1 text-xs text-gray-600">
              Todas las acciones de compliance quedan registradas en AuditLog
              con hash SHA-256 tamper-evident. Las operaciones destructivas
              (anonimización RGPD, ejecución de retención) requieren
              confirmación explícita y las ejecuta únicamente SUPER_ADMIN.
            </p>
          </div>
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
