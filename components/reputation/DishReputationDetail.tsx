import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, MessageSquare, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DishDetail } from '@/lib/db/queries/ratings'

const COURSE_LABEL: Record<string, string> = {
  FIRST: 'Primero',
  SECOND: 'Segundo',
  DESSERT: 'Postre',
}

function ratingClass(avg: number) {
  if (avg >= 4.2) return 'text-emerald-700'
  if (avg >= 3.5) return 'text-amber-700'
  return 'text-red-700'
}

function renderStars(rating: number) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5"
          fill={i < full || (i === full && half) ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  )
}

export function DishReputationDetail({
  detail,
  backHref,
}: {
  detail: DishDetail
  backHref: string
}) {
  const { summary, trend, byCompany, comments } = detail
  const totalStars = Math.max(1, ...Object.values(summary.distribution))
  const maxTrend = Math.max(1, ...trend.map((t) => t.count))
  const withComment = comments.filter((c) => c.comment)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{detail.name}</h1>
          <Badge variant="outline">{COURSE_LABEL[detail.course] ?? detail.course}</Badge>
          <span className={`text-lg font-semibold ${summary.average != null ? ratingClass(summary.average) : ''}`}>
            {summary.average ?? '—'} ⭐
          </span>
          <span className="text-sm text-gray-500">
            {summary.count} valoraciones
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Distribución */}
        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold">Distribución</h3>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution[star as 1 | 2 | 3 | 4 | 5]
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-8 text-right text-gray-500">{star}★</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${(n / totalStars) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-gray-500">{n}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Tendencia */}
        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold">Tendencia mensual</h3>
          {trend.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin datos.</p>
          ) : (
            <div className="flex items-end gap-2">
              {trend.map((t) => (
                <div key={t.period} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">{t.average}</span>
                  <div
                    className="w-full rounded-t bg-amber-400"
                    style={{ height: `${8 + (t.count / maxTrend) * 70}px` }}
                    title={`${t.count} valoraciones`}
                  />
                  <span className="text-[10px] text-gray-400">{t.period.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Por empresa */}
        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold">Por empresa</h3>
          <ul className="space-y-1.5 text-sm">
            {byCompany.map((e) => (
              <li key={e.tenantId} className="flex items-center justify-between">
                <span className="truncate">{e.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">({e.count})</span>
                  <span className={`font-medium ${ratingClass(e.average)}`}>
                    {e.average} ⭐
                  </span>
                </span>
              </li>
            ))}
            {byCompany.length === 0 && (
              <li className="text-xs text-gray-400">Sin datos.</li>
            )}
          </ul>
        </Card>
      </div>

      {/* Todos los comentarios */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">
            Comentarios ({withComment.length})
          </h3>
        </div>
        <div className="space-y-3">
          {withComment.map((c) => (
            <div key={c.id} className="border-l-2 border-gray-200 pl-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {renderStars(c.rating)}
                <span>{c.rating} / 5</span>
                {c.empresaName && (
                  <>
                    <span>·</span>
                    <Badge variant="outline">{c.empresaName}</Badge>
                  </>
                )}
                <span>·</span>
                <span>{format(c.createdAt, "d 'de' MMM yyyy", { locale: es })}</span>
              </div>
              <p className="text-gray-700">"{c.comment}"</p>
            </div>
          ))}
          {withComment.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">
              Este plato aún no tiene comentarios escritos (solo puntuaciones).
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
