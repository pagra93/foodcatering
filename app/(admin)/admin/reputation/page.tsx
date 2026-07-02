import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageSquare, Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getReputationOverview,
  getGlobalRatingComments,
} from '@/lib/db/queries/ratings'
import { ReputationTable } from '@/components/admin/reputation/ReputationTable'

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

export default async function ReputationPage() {
  const [{ global, caterings }, comments] = await Promise.all([
    getReputationOverview(),
    getGlobalRatingComments(20),
  ])

  const totalStars = Math.max(1, ...Object.values(global.distribution))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reputación</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Qué valoran los empleados de cada plato. Compara caterings, busca, y
          entra en cada uno para ver cómo le puntúa cada empresa y qué platos
          fallan. Los platos son propios de cada catering.
        </p>
      </div>

      {/* KPIs globales compactos */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Media global</p>
          <p className="mt-1 text-2xl font-bold">
            {global.average ?? '—'}
            <span className="text-sm font-normal text-gray-500"> / 5</span>
          </p>
          <div className="mt-1">{renderStars(global.average)}</div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Valoraciones totales</p>
          <p className="mt-1 text-2xl font-bold">{global.count}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Caterings valorados</p>
          <p className="mt-1 text-2xl font-bold">{caterings.length}</p>
        </Card>
        <Card className="p-4">
          <p className="mb-1 text-sm text-gray-500">Distribución</p>
          <div className="space-y-0.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = global.distribution[star as 1 | 2 | 3 | 4 | 5]
              return (
                <div key={star} className="flex items-center gap-2 text-[11px]">
                  <span className="w-4 text-right text-gray-500">{star}★</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${(n / totalStars) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-gray-400">{n}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Tabla comparable de caterings (buscar + ordenar + drill-down) */}
      <ReputationTable caterings={caterings} />

      {/* Comentarios recientes */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Comentarios recientes</h3>
        </div>
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="border-l-2 border-gray-200 pl-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {c.cateringName && (
                  <Badge variant="outline">{c.cateringName}</Badge>
                )}
                {renderStars(c.rating)}
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
              No hay comentarios todavía.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
