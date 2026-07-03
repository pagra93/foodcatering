'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronRight,
  MessageSquare,
  Search,
  Star,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type {
  ReputationSummary,
  TrendPoint,
  EntityScore,
  DishRow,
  RatingComment,
} from '@/lib/db/queries/ratings'

const COURSE_LABEL: Record<string, string> = {
  FIRST: 'Primero',
  SECOND: 'Segundo',
  DESSERT: 'Postre',
}

const DIST_COLOR: Record<number, string> = {
  5: 'bg-emerald-500',
  4: 'bg-lime-400',
  3: 'bg-amber-400',
  2: 'bg-orange-400',
  1: 'bg-red-500',
}

function ratingClass(avg: number) {
  if (avg >= 4.2) return 'text-emerald-700'
  if (avg >= 3.5) return 'text-amber-700'
  return 'text-red-700'
}

function DistBar({
  distribution,
  total,
}: {
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
  total: number
}) {
  if (total === 0) return <span className="text-xs text-gray-300">—</span>
  return (
    <div className="flex h-2.5 w-28 overflow-hidden rounded-full bg-gray-100">
      {[5, 4, 3, 2, 1].map((star) => {
        const n = distribution[star as 1 | 2 | 3 | 4 | 5]
        if (n === 0) return null
        return (
          <div
            key={star}
            className={DIST_COLOR[star]}
            style={{ width: `${(n / total) * 100}%` }}
            title={`${star}★: ${n}`}
          />
        )
      })}
    </div>
  )
}

type SortKey = 'name' | 'course' | 'average' | 'count' | 'trendDelta'

function SortHeader({
  label,
  col,
  sort,
  onSort,
  align = 'left',
}: {
  label: string
  col: SortKey
  sort: { key: SortKey; dir: 'asc' | 'desc' }
  onSort: (k: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = sort.key === col
  return (
    <th
      className={cn(
        'cursor-pointer select-none px-4 py-3 font-medium hover:text-gray-900',
        align === 'right' && 'text-right'
      )}
      onClick={() => onSort(col)}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1',
          align === 'right' && 'flex-row-reverse',
          active && 'text-gray-900'
        )}
      >
        {label}
        {active ? (
          <ChevronDown
            className={cn('h-3.5 w-3.5', sort.dir === 'asc' && 'rotate-180')}
          />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />
        )}
      </span>
    </th>
  )
}

type Props = {
  summary: ReputationSummary
  trend: TrendPoint[]
  byCompany: EntityScore[]
  dishes: DishRow[]
  comments: RatingComment[]
  /** Prefijo de la ruta de detalle de plato (portal admin o catering). */
  dishHrefBase: string
}

export function CateringReputationPanel({
  summary,
  trend,
  byCompany,
  dishes,
  comments,
  dishHrefBase,
}: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'average',
    dir: 'desc',
  })

  const onSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' || key === 'course' ? 'asc' : 'desc' }
    )

  const totalStars = Math.max(1, ...Object.values(summary.distribution))
  const lastTrend = trend[trend.length - 1]
  const prevTrend = trend[trend.length - 2]
  const delta =
    lastTrend && prevTrend ? lastTrend.average - prevTrend.average : null
  const maxTrend = Math.max(1, ...trend.map((t) => t.count))

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q ? dishes.filter((d) => d.name.toLowerCase().includes(q)) : dishes
    const dir = sort.dir === 'asc' ? 1 : -1
    const val = (d: DishRow) => {
      switch (sort.key) {
        case 'name':
          return d.name.toLowerCase()
        case 'course':
          return d.course
        case 'average':
          return d.average
        case 'count':
          return d.count
        case 'trendDelta':
          return d.trendDelta ?? -Infinity
      }
    }
    return [...filtered].sort((a, b) => {
      const va = val(a)
      const vb = val(b)
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }, [dishes, query, sort])

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Media</p>
          <p className={cn('mt-1 text-2xl font-bold', summary.average != null && ratingClass(summary.average))}>
            {summary.average ?? '—'}
            <span className="text-sm font-normal text-gray-500"> / 5</span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Valoraciones</p>
          <p className="mt-1 text-2xl font-bold">{summary.count}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Tendencia (mes)</p>
          <p className="mt-1 text-2xl font-bold">
            {lastTrend ? `${lastTrend.average} ⭐` : '—'}
          </p>
          {delta !== null && (
            <p className={cn('mt-1 text-xs', delta >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)} vs mes anterior
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="mb-1 text-sm text-gray-500">Distribución</p>
          <div className="space-y-0.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution[star as 1 | 2 | 3 | 4 | 5]
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

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Tendencia mensual */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 text-base font-semibold">Tendencia mensual</h3>
          {trend.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin datos.</p>
          ) : (
            <div className="flex items-end gap-3">
              {trend.map((t) => (
                <div key={t.period} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">{t.average}</span>
                  <div
                    className="w-full rounded-t bg-amber-400"
                    style={{ height: `${8 + (t.count / maxTrend) * 80}px` }}
                    title={`${t.count} valoraciones`}
                  />
                  <span className="text-[10px] text-gray-400">{t.period.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Por empresa cliente */}
        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold">Por empresa cliente</h3>
          <ul className="space-y-1.5 text-sm">
            {byCompany.map((e) => (
              <li key={e.tenantId} className="flex items-center justify-between">
                <span className="truncate">{e.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">({e.count})</span>
                  <span className={cn('font-medium', ratingClass(e.average))}>
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

      {/* Tabla de platos */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b p-4">
          <h3 className="text-base font-semibold">Platos</h3>
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar plato…"
              className="pl-9"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <SortHeader label="Plato" col="name" sort={sort} onSort={onSort} />
                <SortHeader label="Curso" col="course" sort={sort} onSort={onSort} />
                <SortHeader label="Media" col="average" sort={sort} onSort={onSort} align="right" />
                <SortHeader label="Valoraciones" col="count" sort={sort} onSort={onSort} align="right" />
                <th className="px-4 py-3 text-left font-medium">Distribución</th>
                <SortHeader label="Tendencia" col="trendDelta" sort={sort} onSort={onSort} align="right" />
                <th className="w-8 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr
                  key={d.dishId}
                  className="cursor-pointer border-b last:border-0 hover:bg-gray-50"
                  onClick={() => router.push(`${dishHrefBase}/${d.dishId}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {COURSE_LABEL[d.course] ?? d.course}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn('font-semibold', ratingClass(d.average))}>
                      {d.average} ⭐
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{d.count}</td>
                  <td className="px-4 py-3">
                    <DistBar distribution={d.distribution} total={d.count} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.trendDelta === null ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <span
                        className={cn(
                          'text-xs font-medium',
                          d.trendDelta >= 0 ? 'text-emerald-600' : 'text-red-600'
                        )}
                      >
                        {d.trendDelta >= 0 ? '↑' : '↓'} {Math.abs(d.trendDelta).toFixed(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-gray-300">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                    No hay platos que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Comentarios generales */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Comentarios recientes</h3>
        </div>
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="border-l-2 border-gray-200 pl-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                <span>{c.rating} / 5</span>
                <span>·</span>
                <span className="font-medium text-gray-600">{c.dishName}</span>
                <span>·</span>
                <span>
                  {formatDistanceToNow(c.createdAt, { locale: es, addSuffix: true })}
                </span>
              </div>
              <p className="text-gray-700">"{c.comment}"</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">
              Aún no hay comentarios.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
