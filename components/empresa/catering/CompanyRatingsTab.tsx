import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageSquare, Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type {
  ReputationSummary,
  TrendPoint,
  DishScore,
  RatingComment,
} from '@/lib/db/queries/ratings'

type Props = {
  data: {
    summary: ReputationSummary
    trend: TrendPoint[]
    top: DishScore[]
    bottom: DishScore[]
    comments: RatingComment[]
  }
}

function Stars({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400">—</span>
  const full = Math.floor(value)
  const half = value - full >= 0.5
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5"
          fill={i < full || (i === full && half) ? 'currentColor' : 'none'}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-gray-700">{value}</span>
    </span>
  )
}

/**
 * Cómo puntúan los empleados de ESTA empresa al catering asignado.
 * Fuente: getCompanyCateringReputation (DishRating). Sustituye el avgRating
 * suelto y la lista por-pedido anterior.
 */
export function CompanyRatingsTab({ data }: Props) {
  const { summary, trend, top, bottom, comments } = data
  const maxStar = Math.max(1, ...Object.values(summary.distribution))
  const lastTrend = trend[trend.length - 1]
  const prevTrend = trend[trend.length - 2]
  const delta =
    lastTrend && prevTrend ? lastTrend.average - prevTrend.average : null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Valoración media</p>
          <p className="mt-1 text-2xl font-bold">
            {summary.average ?? '—'}
            <span className="text-sm font-normal text-gray-500"> / 5</span>
          </p>
          <div className="mt-1">
            <Stars value={summary.average} />
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Valoraciones de tus empleados</p>
          <p className="mt-1 text-2xl font-bold">{summary.count}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Tendencia (mes)</p>
          <p className="mt-1 text-2xl font-bold">
            {lastTrend ? `${lastTrend.average} ⭐` : '—'}
          </p>
          {delta !== null && (
            <p
              className={`mt-1 text-xs ${
                delta >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)} vs mes anterior
            </p>
          )}
        </Card>
      </div>

      {/* Distribución de estrellas */}
      <Card className="p-5">
        <h3 className="mb-3 text-base font-semibold">Distribución de estrellas</h3>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = summary.distribution[star as 1 | 2 | 3 | 4 | 5]
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-8 text-right text-gray-500">{star}★</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${(n / maxStar) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-gray-500">{n}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Top / bottom platos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold text-emerald-700">
            Platos que más gustan a tu plantilla
          </h3>
          <ol className="space-y-2 text-sm">
            {top.map((d, i) => (
              <li key={d.dishId} className="flex items-center justify-between">
                <span>
                  <span className="mr-2 text-xs text-gray-500">#{i + 1}</span>
                  {d.name}
                  <span className="ml-2 text-xs text-gray-400">
                    ({d.count})
                  </span>
                </span>
                <span className="font-medium">{d.average} ⭐</span>
              </li>
            ))}
            {top.length === 0 && (
              <li className="py-4 text-center text-xs text-gray-500">
                Tus empleados aún no han valorado platos.
              </li>
            )}
          </ol>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold text-red-700">
            Platos peor valorados
          </h3>
          <ol className="space-y-2 text-sm">
            {bottom.map((d, i) => (
              <li key={d.dishId} className="flex items-center justify-between">
                <span>
                  <span className="mr-2 text-xs text-gray-500">#{i + 1}</span>
                  {d.name}
                  <span className="ml-2 text-xs text-gray-400">
                    ({d.count})
                  </span>
                </span>
                <span className="font-medium">{d.average} ⭐</span>
              </li>
            ))}
            {bottom.length === 0 && (
              <li className="py-4 text-center text-xs text-gray-500">
                Sin datos suficientes.
              </li>
            )}
          </ol>
        </Card>
      </div>

      {/* Comentarios */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Comentarios de tus empleados</h3>
        </div>
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="border-l-2 border-gray-200 pl-3 text-sm">
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                <span>{c.rating} / 5</span>
                <span>·</span>
                <span className="font-medium text-gray-600">{c.dishName}</span>
                <span>·</span>
                <span>
                  {formatDistanceToNow(c.createdAt, {
                    locale: es,
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="text-gray-700">"{c.comment}"</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">
              Aún no hay comentarios de tus empleados.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
