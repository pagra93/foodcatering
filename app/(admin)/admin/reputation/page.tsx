import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageSquare, Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getGlobalReputation,
  getReputationByCatering,
  getReputationCompanyMatrix,
  getGlobalDishLeaderboard,
  getGlobalRatingComments,
} from '@/lib/db/queries/ratings'

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

/** Color de una nota media 1–5 para la matriz. */
function scoreClass(avg: number) {
  if (avg >= 4.2) return 'bg-emerald-100 text-emerald-800'
  if (avg >= 3.5) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

export default async function ReputationPage() {
  const [summary, byCatering, matrix, dishes, comments] = await Promise.all([
    getGlobalReputation(),
    getReputationByCatering(50),
    getReputationCompanyMatrix(),
    getGlobalDishLeaderboard(10),
    getGlobalRatingComments(20),
  ])

  const totalStars = Math.max(1, ...Object.values(summary.distribution))
  const cellByPair = new Map(
    matrix.cells.map((c) => [`${c.tenantCatering}|${c.tenantEmpresa}`, c])
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reputación</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Valoraciones que los empleados dejan a cada plato tras recibir su
          comida. Úsalo para ver la calidad real del servicio de cada catering y,
          sobre todo, cómo puntúa <strong>cada empresa a su catering</strong>.
        </p>
      </div>

      {/* KPIs globales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Valoración media global</p>
          <p className="mt-1 text-2xl font-bold">
            {summary.average ?? '—'}
            <span className="text-sm font-normal text-gray-500"> / 5</span>
          </p>
          <div className="mt-1">{renderStars(summary.average)}</div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Valoraciones totales</p>
          <p className="mt-1 text-2xl font-bold">{summary.count}</p>
        </Card>
        <Card className="p-4 md:col-span-2">
          <p className="mb-2 text-sm text-gray-500">Distribución de estrellas</p>
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution[star as 1 | 2 | 3 | 4 | 5]
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-right text-gray-500">{star}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${(n / totalStars) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-gray-500">{n}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Matriz catering × empresa */}
      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <h3 className="text-base font-semibold">
            Calidad de servicio por relación (catering × empresa)
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Nota media que dan los empleados de cada empresa a cada catering. El
            insight clave: detectar relaciones catering–empresa que flojean.
          </p>
        </div>
        {matrix.caterings.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            Aún no hay valoraciones.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Catering \ Empresa</th>
                  {matrix.empresas.map((e) => (
                    <th key={e.id} className="px-4 py-3 text-center">
                      {e.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.caterings.map((cat) => (
                  <tr key={cat.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{cat.name}</td>
                    {matrix.empresas.map((emp) => {
                      const cell = cellByPair.get(`${cat.id}|${emp.id}`)
                      return (
                        <td key={emp.id} className="px-4 py-3 text-center">
                          {cell ? (
                            <span
                              className={`inline-flex flex-col items-center rounded-md px-2 py-1 ${scoreClass(
                                cell.average
                              )}`}
                            >
                              <span className="font-semibold">
                                {cell.average} ⭐
                              </span>
                              <span className="text-[10px] opacity-70">
                                {cell.count}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Ranking por catering */}
      <Card className="p-5">
        <h3 className="mb-3 text-base font-semibold">Ranking de caterings</h3>
        <ol className="space-y-2 text-sm">
          {byCatering.map((c, i) => (
            <li key={c.tenantId} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-5 text-xs text-gray-500">#{i + 1}</span>
                <span>{c.name}</span>
                <span className="text-xs text-gray-400">
                  ({c.count} valoraciones)
                </span>
              </span>
              {renderStars(c.average)}
            </li>
          ))}
          {byCatering.length === 0 && (
            <li className="py-4 text-center text-sm text-gray-500">
              Aún no hay valoraciones.
            </li>
          )}
        </ol>
      </Card>

      {/* Leaderboards de platos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold text-emerald-700">
            Mejores platos de la plataforma
          </h3>
          <ol className="space-y-2 text-sm">
            {dishes.top.map((d, i) => (
              <li key={d.dishId} className="flex items-center justify-between">
                <span>
                  <span className="mr-2 text-xs text-gray-500">#{i + 1}</span>
                  {d.name}
                  <span className="ml-2 text-xs text-gray-400">({d.count})</span>
                </span>
                <span className="font-medium">{d.average} ⭐</span>
              </li>
            ))}
            {dishes.top.length === 0 && (
              <li className="py-4 text-center text-xs text-gray-500">
                Sin datos suficientes.
              </li>
            )}
          </ol>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold text-red-700">
            Platos peor valorados — posible atención
          </h3>
          <ol className="space-y-2 text-sm">
            {dishes.bottom.map((d, i) => (
              <li key={d.dishId} className="flex items-center justify-between">
                <span>
                  <span className="mr-2 text-xs text-gray-500">#{i + 1}</span>
                  {d.name}
                  <span className="ml-2 text-xs text-gray-400">({d.count})</span>
                </span>
                <span className="font-medium">{d.average} ⭐</span>
              </li>
            ))}
            {dishes.bottom.length === 0 && (
              <li className="py-4 text-center text-xs text-gray-500">
                Sin datos suficientes.
              </li>
            )}
          </ol>
        </Card>
      </div>

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
