'use client'

import { Fragment, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Search,
  Star,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { CateringReputationRow } from '@/lib/db/queries/ratings'

type SortKey =
  | 'name'
  | 'average'
  | 'count'
  | 'avg30d'
  | 'trendDelta'
  | 'companies'

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
    <div className="flex h-2.5 w-32 overflow-hidden rounded-full bg-gray-100">
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
  align?: 'left' | 'right' | 'center'
}) {
  const active = sort.key === col
  return (
    <th
      className={cn(
        'cursor-pointer select-none px-4 py-3 font-medium hover:text-gray-900',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center'
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
            className={cn('h-3.5 w-3.5 transition-transform', sort.dir === 'asc' && 'rotate-180')}
          />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />
        )}
      </span>
    </th>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold', ratingClass(value))}>
      <Star className="h-3.5 w-3.5 fill-current" />
      {value}
    </span>
  )
}

export function ReputationTable({ caterings }: { caterings: CateringReputationRow[] }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'average',
    dir: 'desc',
  })
  const [expanded, setExpanded] = useState<string | null>(null)

  const onSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' }
    )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? caterings.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.companies.some((e) => e.name.toLowerCase().includes(q))
        )
      : caterings
    const dir = sort.dir === 'asc' ? 1 : -1
    const val = (c: CateringReputationRow) => {
      switch (sort.key) {
        case 'name':
          return c.name.toLowerCase()
        case 'average':
          return c.average
        case 'count':
          return c.count
        case 'avg30d':
          return c.avg30d ?? -1
        case 'trendDelta':
          return c.trendDelta ?? -Infinity
        case 'companies':
          return c.companies.length
      }
    }
    return [...filtered].sort((a, b) => {
      const va = val(a)
      const vb = val(b)
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }, [caterings, query, sort])

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b p-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar catering o empresa…"
            className="pl-9"
          />
        </div>
        <span className="ml-auto text-xs text-gray-500">
          {rows.length} de {caterings.length} caterings
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="w-8 px-2 py-3" />
              <SortHeader label="Catering" col="name" sort={sort} onSort={onSort} />
              <SortHeader label="Media" col="average" sort={sort} onSort={onSort} align="right" />
              <SortHeader label="Valoraciones" col="count" sort={sort} onSort={onSort} align="right" />
              <th className="px-4 py-3 text-left font-medium">Distribución</th>
              <SortHeader label="30 días" col="avg30d" sort={sort} onSort={onSort} align="right" />
              <SortHeader label="Tendencia" col="trendDelta" sort={sort} onSort={onSort} align="right" />
              <SortHeader label="Empresas" col="companies" sort={sort} onSort={onSort} align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const open = expanded === c.tenantId
              return (
                <Fragment key={c.tenantId}>
                  <tr
                    className="cursor-pointer border-b last:border-0 hover:bg-gray-50"
                    onClick={() => setExpanded(open ? null : c.tenantId)}
                  >
                    <td className="px-2 py-3 text-gray-400">
                      {open ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-right">
                      <Stars value={c.average} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{c.count}</td>
                    <td className="px-4 py-3">
                      <DistBar distribution={c.distribution} total={c.count} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {c.avg30d ?? '—'}
                      {c.count30d > 0 && (
                        <span className="ml-1 text-xs text-gray-400">
                          ({c.count30d})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.trendDelta === null ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span
                          className={cn(
                            'text-xs font-medium',
                            c.trendDelta >= 0 ? 'text-emerald-600' : 'text-red-600'
                          )}
                        >
                          {c.trendDelta >= 0 ? '↑' : '↓'}{' '}
                          {Math.abs(c.trendDelta).toFixed(1)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {c.companies.length}
                    </td>
                  </tr>

                  {open && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="grid gap-6 lg:grid-cols-3">
                          {/* Por empresa */}
                          <div className="lg:col-span-1">
                            <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">
                              Por empresa cliente
                            </h4>
                            <ul className="space-y-1.5">
                              {c.companies.map((e) => (
                                <li
                                  key={e.tenantId}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="truncate">{e.name}</span>
                                  <span className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">
                                      ({e.count})
                                    </span>
                                    <span className={cn('font-medium', ratingClass(e.average))}>
                                      {e.average} ⭐
                                    </span>
                                  </span>
                                </li>
                              ))}
                              {c.companies.length === 0 && (
                                <li className="text-xs text-gray-400">Sin datos.</li>
                              )}
                            </ul>
                          </div>

                          {/* Mejores platos */}
                          <div className="lg:col-span-1">
                            <h4 className="mb-2 text-xs font-semibold uppercase text-emerald-700">
                              Mejores platos
                            </h4>
                            <ul className="space-y-1.5">
                              {c.topDishes.map((d) => (
                                <li
                                  key={d.dishId}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="truncate">{d.name}</span>
                                  <span className="ml-2 shrink-0 font-medium">
                                    {d.average} ⭐
                                    <span className="ml-1 text-xs text-gray-400">
                                      ({d.count})
                                    </span>
                                  </span>
                                </li>
                              ))}
                              {c.topDishes.length === 0 && (
                                <li className="text-xs text-gray-400">Sin datos.</li>
                              )}
                            </ul>
                          </div>

                          {/* Peores platos */}
                          <div className="lg:col-span-1">
                            <h4 className="mb-2 text-xs font-semibold uppercase text-red-700">
                              Platos a vigilar
                            </h4>
                            <ul className="space-y-1.5">
                              {c.bottomDishes.map((d) => (
                                <li
                                  key={d.dishId}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="truncate">{d.name}</span>
                                  <span className="ml-2 shrink-0 font-medium">
                                    {d.average} ⭐
                                    <span className="ml-1 text-xs text-gray-400">
                                      ({d.count})
                                    </span>
                                  </span>
                                </li>
                              ))}
                              {c.bottomDishes.length === 0 && (
                                <li className="text-xs text-gray-400">Sin datos.</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                  No hay caterings que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
