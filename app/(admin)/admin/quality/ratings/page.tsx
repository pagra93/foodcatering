import Link from 'next/link'
import { ArrowLeft, MessageSquare, Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getGlobalRatingStats,
  getRatingsByCatering,
  getRecentRatingComments,
} from '@/lib/db/queries/admin-quality'

function renderStars(rating: number | null) {
  if (rating === null) return <span className="text-gray-400">—</span>
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
      <span className="ml-1 text-xs font-medium text-gray-700">{rating}</span>
    </span>
  )
}

export default async function RatingsPage() {
  const [stats, ratings, comments] = await Promise.all([
    getGlobalRatingStats(),
    getRatingsByCatering(30),
    getRecentRatingComments(20),
  ])

  const top10 = ratings.slice(0, 10)
  const bottom10 = [...ratings].sort((a, b) => a.avgRating - b.avgRating).slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/quality">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Calidad
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Rating y Reputación</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Agregaciones de las valoraciones que los empleados dejan tras recibir
          sus pedidos. Rating general + tres dimensiones (sabor, porción,
          presentación). Detecta tendencias y comentarios clave.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Rating medio global</p>
          <p className="mt-1 text-2xl font-bold">
            {stats.averageRating ?? '—'}
            <span className="text-sm font-normal text-gray-500"> / 5</span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Valoraciones totales</p>
          <p className="mt-1 text-2xl font-bold">{stats.totalRatings}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Últimos 30 días</p>
          <p className="mt-1 text-2xl font-bold">{stats.ratingsLast30d}</p>
          <p className="mt-1 text-xs text-gray-500">
            media: {stats.avgRatingLast30d ?? '—'} ⭐
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Con comentario</p>
          <p className="mt-1 text-2xl font-bold">{stats.percentWithComment}%</p>
        </Card>
      </div>

      {/* Desglose por dimensión */}
      <Card className="p-5">
        <h3 className="mb-3 text-base font-semibold">Media por dimensión</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-gray-500">General</p>
            <div className="mt-1">{renderStars(stats.averageRating)}</div>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Sabor</p>
            <div className="mt-1">{renderStars(stats.averageTaste)}</div>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Porción</p>
            <div className="mt-1">{renderStars(stats.averagePortion)}</div>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Presentación</p>
            <div className="mt-1">{renderStars(stats.averagePresentation)}</div>
          </div>
        </div>
      </Card>

      {/* Top / Bottom 10 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold text-emerald-700">
            Top 10 caterings
          </h3>
          <ol className="space-y-2 text-sm">
            {top10.map((r, i) => (
              <li
                key={r.tenantCatering}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <span className="w-4 text-xs text-gray-500">#{i + 1}</span>
                  <span>{r.cateringName}</span>
                  <span className="text-xs text-gray-400">
                    ({r.totalRatings} valoraciones)
                  </span>
                </span>
                {renderStars(r.avgRating)}
              </li>
            ))}
            {top10.length === 0 && (
              <li className="py-4 text-center text-sm text-gray-500">
                Aún no hay valoraciones suficientes.
              </li>
            )}
          </ol>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold text-red-700">
            Bottom 10 caterings — posible atención
          </h3>
          <ol className="space-y-2 text-sm">
            {bottom10.map((r, i) => (
              <li
                key={r.tenantCatering}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <span className="w-4 text-xs text-gray-500">#{i + 1}</span>
                  <span>{r.cateringName}</span>
                  <span className="text-xs text-gray-400">
                    ({r.totalRatings})
                  </span>
                </span>
                {renderStars(r.avgRating)}
              </li>
            ))}
            {bottom10.length === 0 && (
              <li className="py-4 text-center text-sm text-gray-500">
                Sin datos.
              </li>
            )}
          </ol>
        </Card>
      </div>

      {/* Stream de comentarios */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <h3 className="text-base font-semibold">Comentarios recientes</h3>
        </div>
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className="border-l-2 border-gray-200 pl-3 text-sm"
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                <Badge variant="outline">{c.cateringName}</Badge>
                <span>·</span>
                {renderStars(c.rating)}
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
              No hay comentarios todavía.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
