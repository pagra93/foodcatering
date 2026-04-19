import Link from 'next/link'
import { AlertTriangle, ChevronRight, ShieldCheck, Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getCateringOwnRatingStats,
  getOwnPenaltiesKPIs,
  getSlaByClient,
} from '@/lib/db/queries/catering-calidad'

export async function QualityWidgets({ tenantId }: { tenantId: string }) {
  const [stats, penalties, slas] = await Promise.all([
    getCateringOwnRatingStats(tenantId),
    getOwnPenaltiesKPIs(tenantId),
    getSlaByClient(tenantId),
  ])

  const slasAtRisk = slas.filter((s) => !s.overallOk)
  const weekTrend =
    stats.avgThisWeek !== null && stats.avgPrevWeek !== null
      ? stats.avgThisWeek - stats.avgPrevWeek
      : null

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Rating esta semana */}
      <Link href="/catering/calidad" className="group">
        <Card className="p-5 transition-colors group-hover:bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-medium text-gray-700">
                Rating esta semana
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-bold">
              {stats.avgThisWeek ?? '—'}
              {stats.avgThisWeek !== null && (
                <span className="text-sm font-normal text-gray-500"> / 5</span>
              )}
            </p>
            {weekTrend !== null && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  weekTrend >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {weekTrend >= 0 ? '↑' : '↓'} {Math.abs(weekTrend).toFixed(1)}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {stats.total} valoraciones totales · {stats.ratings30d} en 30 días
          </p>
        </Card>
      </Link>

      {/* SLAs en riesgo */}
      <Link href="/catering/calidad" className="group">
        <Card
          className={`p-5 transition-colors group-hover:bg-gray-50 ${
            slasAtRisk.length > 0
              ? 'border-amber-200 bg-amber-50/50'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck
                className={`h-4 w-4 ${
                  slasAtRisk.length > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              />
              <p className="text-sm font-medium text-gray-700">
                Cumplimiento SLAs
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-3 text-2xl font-bold">
            {slas.length - slasAtRisk.length}
            <span className="text-sm font-normal text-gray-500">
              {' '}
              / {slas.length} OK
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {slasAtRisk.length === 0
              ? 'Cumples SLA con todos los clientes'
              : `${slasAtRisk.length} ${
                  slasAtRisk.length === 1 ? 'cliente' : 'clientes'
                } en riesgo · revisa`}
          </p>
        </Card>
      </Link>

      {/* Penalizaciones activas */}
      <Link href="/catering/calidad" className="group">
        <Card
          className={`p-5 transition-colors group-hover:bg-gray-50 ${
            penalties.applied + penalties.disputed > 0
              ? 'border-red-200 bg-red-50/40'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`h-4 w-4 ${
                  penalties.applied + penalties.disputed > 0
                    ? 'text-red-600'
                    : 'text-gray-400'
                }`}
              />
              <p className="text-sm font-medium text-gray-700">
                Penalizaciones activas
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-3 text-2xl font-bold">
            {penalties.applied + penalties.disputed}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {penalties.applied + penalties.disputed === 0
              ? 'Sin penalizaciones activas'
              : `${Number(penalties.activeSum).toFixed(2)} € en revisión · ${penalties.disputed} disputadas`}
          </p>
        </Card>
      </Link>
    </div>
  )
}
