import Link from 'next/link'
import {
  ChevronRight,
  FileText,
  Gavel,
  Star,
  TrendingDown,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getQualityDashboardKPIs,
  getRatingsByCatering,
} from '@/lib/db/queries/admin-quality'
import {
  getAuditsKPIs,
} from '@/lib/db/queries/admin-audits'
import { getPenaltiesKPIs } from '@/lib/db/queries/admin-penalties'

export default async function QualityDashboardPage() {
  const [quality, audits, penalties, ratings] = await Promise.all([
    getQualityDashboardKPIs(),
    getAuditsKPIs(),
    getPenaltiesKPIs(),
    getRatingsByCatering(20),
  ])

  const bottom5 = [...ratings].sort((a, b) => a.avgRating - b.avgRating).slice(0, 5)
  const top5 = ratings.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calidad y SLAs</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Vista global del estado de calidad del servicio a lo largo de toda
          la plataforma. Detecta caterings con problemas antes de que escalen.
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Rating medio (30d)</p>
            <Star className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-1 text-2xl font-bold">
            {quality.avgRating30d ?? '—'}
          </p>
          <p className="mt-1 text-xs text-gray-500">sobre 5 estrellas</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Auditorías (30d)</p>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-2xl font-bold">{quality.pendingAudits}</p>
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
          href="/admin/quality/ratings"
          title="Rating y Reputación"
          description="Rankings, tendencias, comentarios recientes. Ratings agregados por catering y por plato."
          badge={
            quality.avgRating30d
              ? `${quality.avgRating30d} ⭐ media`
              : 'sin datos'
          }
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

      {/* Top / Bottom caterings */}
      {ratings.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Star className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-semibold">Top 5 caterings</h3>
            </div>
            <ul className="space-y-2 text-sm">
              {top5.map((r, i) => (
                <li
                  key={r.tenantCatering}
                  className="flex items-center justify-between"
                >
                  <span>
                    <span className="mr-2 text-xs text-gray-500">#{i + 1}</span>
                    {r.cateringName}
                  </span>
                  <Badge variant="outline">{r.avgRating} ⭐</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <h3 className="text-base font-semibold">
                Bottom 5 caterings — posible atención
              </h3>
            </div>
            <ul className="space-y-2 text-sm">
              {bottom5.map((r) => (
                <li
                  key={r.tenantCatering}
                  className="flex items-center justify-between"
                >
                  <span>{r.cateringName}</span>
                  <Badge variant="destructive">{r.avgRating} ⭐</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
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
