import Link from 'next/link'
import { ChevronRight, FileText, Gavel } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAuditsKPIs } from '@/lib/db/queries/admin-audits'
import { getPenaltiesKPIs } from '@/lib/db/queries/admin-penalties'

export default async function QualityDashboardPage() {
  const [audits, penalties] = await Promise.all([
    getAuditsKPIs(),
    getPenaltiesKPIs(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calidad y SLAs</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Auditorías externas y penalizaciones aplicadas a los caterings. Las
          valoraciones de los empleados viven en la sección{' '}
          <Link href="/admin/reputation" className="text-primary hover:underline">
            Reputación
          </Link>
          .
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Auditorías (30d)</p>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-2xl font-bold">{audits.total}</p>
          <p className="mt-1 text-xs text-gray-500">
            {audits.stale} caterings sin auditoría reciente
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Penalizaciones PENDING</p>
            <Gavel className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-1 text-2xl font-bold">{penalties.pending}</p>
          <p className="mt-1 text-xs text-gray-500">
            {Number(penalties.totalPendingAmount).toFixed(2)} € pendientes
          </p>
        </Card>
      </div>

      {/* Sub-módulos */}
      <div className="grid gap-3 md:grid-cols-2">
        <SubModule
          href="/admin/quality/audits"
          title="Auditorías"
          description="Auditorías sanitarias, operativas y de satisfacción de caterings. Registra nuevas y consulta histórico."
          badge={`${audits.total} totales`}
        />
        <SubModule
          href="/admin/quality/penalties"
          title="Penalizaciones"
          description="Sanciones económicas. Aplica, perdona, revisa disputas de caterings."
          badge={
            penalties.pending + penalties.disputed > 0
              ? `${penalties.pending + penalties.disputed} por revisar`
              : 'al día'
          }
        />
      </div>
    </div>
  )
}

function SubModule({
  href,
  title,
  description,
  badge,
}: {
  href: string
  title: string
  description: string
  badge: string
}) {
  return (
    <Link href={href} className="group">
      <Card className="p-5 transition-colors group-hover:bg-gray-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{title}</h3>
              <Badge variant="outline" className="text-xs">
                {badge}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  )
}
