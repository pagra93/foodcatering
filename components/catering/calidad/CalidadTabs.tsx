'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Star,
} from 'lucide-react'
import type {
  AuditType,
  DishCourse,
  PenaltyStatus,
  PenaltyType,
  RestaurantAudit,
  AssignmentType,
} from '@prisma/client'
import { DISPUTE_WINDOW_DAYS } from '@/lib/validations/penalty'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DisputePenaltyButton } from './DisputePenaltyButton'

// ─── Types ──────────────────────────────────────────────────────────────

type Tab = 'ratings' | 'audits' | 'penalties' | 'slas'

type RatingStats = {
  total: number
  averageRating: number | null
  averageTaste: number | null
  averagePortion: number | null
  averagePresentation: number | null
  ratings30d: number
  avg30d: number | null
  avgThisWeek: number | null
  avgPrevWeek: number | null
}

type DishRating = {
  dishId: string
  name: string
  course: DishCourse
  avgRating: number
  ratings: number
}

type Comment = {
  id: string
  rating: number
  comment: string | null
  createdAt: Date
  dishName?: string
}

type CompanyScore = {
  tenantId: string
  name: string
  average: number
  count: number
}

type PenaltyRow = {
  id: string
  type: PenaltyType
  status: PenaltyStatus
  reason: string
  amount: string
  appliedAt: Date
  settledAt: Date | null
  disputedAt: Date | null
  disputeReason: string | null
  notes: string | null
}

type SlaRow = {
  assignmentId: string
  companyName: string
  type: AssignmentType
  slaPunctuality: number | null
  slaIncidentRate: number | null
  realPunctuality: number | null
  realIncidentRate: number | null
  totalOrders: number
  incidents: number
  punctualityOk: boolean
  incidentOk: boolean
  overallOk: boolean
}

type Props = {
  stats: RatingStats
  topDishes: DishRating[]
  bottomDishes: DishRating[]
  comments: Comment[]
  byCompany: CompanyScore[]
  audits: RestaurantAudit[]
  penalties: PenaltyRow[]
  slas: SlaRow[]
}

// ─── Helpers ────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return 'text-emerald-600'
  if (s >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function starsInline(rating: number | null) {
  if (rating === null) return '—'
  return `${rating.toFixed(1)} ⭐`
}

const AUDIT_TYPE_LABEL: Record<AuditType, string> = {
  SANITARIA: 'Sanitaria',
  OPERATIVA: 'Operativa',
  SATISFACCION: 'Satisfacción',
}

const PENALTY_STATUS_META: Record<
  PenaltyStatus,
  { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }
> = {
  PENDING: { label: 'En revisión', variant: 'secondary' },
  APPLIED: { label: 'Aplicada', variant: 'destructive' },
  DISPUTED: { label: 'En disputa', variant: 'outline' },
  WAIVED: { label: 'Perdonada', variant: 'default' },
}

const PENALTY_TYPE_LABEL: Record<PenaltyType, string> = {
  SLA_BREACH: 'SLA incumplido',
  DOC_EXPIRED: 'Documentación caducada',
  INCIDENT_THRESHOLD: 'Umbral de incidencias',
  MANUAL: 'Manual',
}

// ─── Main component ─────────────────────────────────────────────────────

export function CalidadTabs(props: Props) {
  const [tab, setTab] = useState<Tab>('ratings')

  const tabs: { id: Tab; label: string; badge?: string }[] = [
    { id: 'ratings', label: 'Ratings', badge: props.stats.averageRating ? `${props.stats.averageRating} ⭐` : undefined },
    { id: 'audits', label: 'Auditorías', badge: `${props.audits.length}` },
    {
      id: 'penalties',
      label: 'Penalizaciones',
      badge:
        props.penalties.filter((p) => p.status === 'APPLIED' || p.status === 'DISPUTED').length > 0
          ? `${props.penalties.filter((p) => p.status === 'APPLIED' || p.status === 'DISPUTED').length} activas`
          : undefined,
    },
    {
      id: 'slas',
      label: 'SLAs por cliente',
      badge: `${props.slas.filter((s) => !s.overallOk).length} en riesgo`,
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            {t.label}
            {t.badge && (
              <Badge variant="outline" className="text-xs">
                {t.badge}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {tab === 'ratings' && <RatingsTab {...props} />}
      {tab === 'audits' && <AuditsTab audits={props.audits} />}
      {tab === 'penalties' && <PenaltiesTab penalties={props.penalties} />}
      {tab === 'slas' && <SlasTab slas={props.slas} />}
    </div>
  )
}

// ─── Tab: Ratings ───────────────────────────────────────────────────────

function RatingsTab({
  stats,
  topDishes,
  bottomDishes,
  comments,
  byCompany,
}: {
  stats: RatingStats
  topDishes: DishRating[]
  bottomDishes: DishRating[]
  comments: Comment[]
  byCompany: CompanyScore[]
}) {
  const weekTrend =
    stats.avgThisWeek !== null && stats.avgPrevWeek !== null
      ? stats.avgThisWeek - stats.avgPrevWeek
      : null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Rating medio</p>
          <p className="mt-1 text-2xl font-bold">{starsInline(stats.averageRating)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {stats.total} valoraciones de platos
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Últimos 30 días</p>
          <p className="mt-1 text-2xl font-bold">{starsInline(stats.avg30d)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {stats.ratings30d} valoraciones
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Esta semana</p>
          <p className="mt-1 text-2xl font-bold">{starsInline(stats.avgThisWeek)}</p>
          {weekTrend !== null && (
            <p
              className={`mt-1 text-xs ${
                weekTrend >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {weekTrend >= 0 ? '↑' : '↓'} {Math.abs(weekTrend).toFixed(1)} vs semana pasada
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold text-emerald-700">
            Platos mejor valorados
          </h3>
          <ol className="space-y-2 text-sm">
            {topDishes.map((d, i) => (
              <li key={d.dishId} className="flex items-center justify-between">
                <span>
                  <span className="mr-2 text-xs text-gray-500">#{i + 1}</span>
                  {d.name}
                  <span className="ml-2 text-xs text-gray-400">
                    ({d.ratings} valoraciones)
                  </span>
                </span>
                <span className="font-medium">{d.avgRating} ⭐</span>
              </li>
            ))}
            {topDishes.length === 0 && (
              <li className="py-4 text-center text-xs text-gray-500">
                Aún no hay platos valorados.
              </li>
            )}
          </ol>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold text-red-700">
            Platos con peor valoración
          </h3>
          <ol className="space-y-2 text-sm">
            {bottomDishes.map((d, i) => (
              <li key={d.dishId} className="flex items-center justify-between">
                <span>
                  <span className="mr-2 text-xs text-gray-500">#{i + 1}</span>
                  {d.name}
                  <span className="ml-2 text-xs text-gray-400">
                    ({d.ratings})
                  </span>
                </span>
                <span className="font-medium">{d.avgRating} ⭐</span>
              </li>
            ))}
            {bottomDishes.length === 0 && (
              <li className="py-4 text-center text-xs text-gray-500">
                Sin datos suficientes.
              </li>
            )}
          </ol>
        </Card>
      </div>

      {/* Cómo te valora cada empresa cliente */}
      <Card className="p-5">
        <h3 className="mb-3 text-base font-semibold">
          Valoración por empresa cliente
        </h3>
        <p className="mb-3 text-xs text-gray-500">
          Nota media que dan los empleados de cada empresa a tus platos. Detecta
          en qué cliente flojea el servicio.
        </p>
        <ol className="space-y-2 text-sm">
          {byCompany.map((c) => (
            <li key={c.tenantId} className="flex items-center justify-between">
              <span className="truncate">{c.name}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  ({c.count} valoraciones)
                </span>
                <span className="font-medium">{c.average} ⭐</span>
              </span>
            </li>
          ))}
          {byCompany.length === 0 && (
            <li className="py-4 text-center text-xs text-gray-500">
              Aún no hay valoraciones de ninguna empresa.
            </li>
          )}
        </ol>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Comentarios recientes</h3>
        </div>
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className="border-l-2 border-gray-200 pl-3 text-sm"
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                <span>{c.rating} / 5</span>
                {c.dishName && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-gray-600">
                      {c.dishName}
                    </span>
                  </>
                )}
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
              Aún no hay comentarios.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}

// ─── Tab: Auditorías ────────────────────────────────────────────────────

function AuditsTab({ audits }: { audits: RestaurantAudit[] }) {
  const low = audits.filter((a) => a.score < 60)

  return (
    <div className="space-y-4">
      {low.length > 0 && (
        <Card className="border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {low.length} {low.length === 1 ? 'auditoría' : 'auditorías'} con score &lt;60
              </p>
              <p className="mt-1 text-xs text-red-700">
                Revisa áreas de mejora. Scores bajos pueden derivar en
                penalizaciones o afectar a tus asignaciones con empresas.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Notas</th>
              <th className="px-4 py-3 text-right">Informe</th>
            </tr>
          </thead>
          <tbody>
            {audits.map((a) => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">{AUDIT_TYPE_LABEL[a.auditType]}</td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${scoreColor(a.score)}`}
                >
                  {a.score}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {format(a.auditedAt, 'dd MMM yyyy', { locale: es })}
                </td>
                <td className="max-w-[300px] px-4 py-3 text-xs text-gray-600">
                  <div className="truncate" title={a.notes ?? ''}>
                    {a.notes ?? '—'}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {a.reportUrl ? (
                    <a
                      href={a.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Ver PDF
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {audits.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay auditorías registradas sobre tu catering.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ─── Tab: Penalizaciones ────────────────────────────────────────────────


function PenaltiesTab({ penalties }: { penalties: PenaltyRow[] }) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Tipo</th>
            <th className="px-4 py-3 text-left">Motivo</th>
            <th className="px-4 py-3 text-right">Importe</th>
            <th className="px-4 py-3 text-left">Estado</th>
            <th className="px-4 py-3 text-left">Fecha</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {penalties.map((p) => {
            const canDispute =
              p.status === 'APPLIED' &&
              p.settledAt &&
              Date.now() - p.settledAt.getTime() <
                DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000

            return (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 text-xs">
                  <Badge variant="outline">{PENALTY_TYPE_LABEL[p.type]}</Badge>
                </td>
                <td className="max-w-[300px] px-4 py-3">
                  <div className="text-sm text-gray-700" title={p.reason}>
                    {p.reason}
                  </div>
                  {p.status === 'DISPUTED' && p.disputeReason && (
                    <div className="mt-1 rounded bg-amber-50 p-2 text-[11px] text-amber-800">
                      <strong>Tu disputa:</strong> {p.disputeReason}
                    </div>
                  )}
                  {p.status === 'WAIVED' && p.notes && p.notes.includes('[Perdonada]') && (
                    <div className="mt-1 rounded bg-emerald-50 p-2 text-[11px] text-emerald-800">
                      {p.notes.split('[Perdonada]')[1]?.trim()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {Number(p.amount).toFixed(2)} €
                </td>
                <td className="px-4 py-3">
                  <Badge variant={PENALTY_STATUS_META[p.status].variant}>
                    {PENALTY_STATUS_META[p.status].label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {format(p.appliedAt, 'dd MMM yyyy', { locale: es })}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {canDispute && <DisputePenaltyButton penaltyId={p.id} />}
                    {p.status === 'APPLIED' && !canDispute && (
                      <span className="text-xs text-gray-400">
                        Plazo disputa expirado
                      </span>
                    )}
                    <Link
                      href={`/catering/calidad/penalizaciones/${p.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Ver / responder →
                    </Link>
                  </div>
                </td>
              </tr>
            )
          })}
          {penalties.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-12 text-center text-sm text-gray-500"
              >
                No tienes penalizaciones. ¡Sigue así!
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  )
}

// ─── Tab: SLAs ──────────────────────────────────────────────────────────

function SlasTab({ slas }: { slas: SlaRow[] }) {
  if (slas.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-gray-500">
        Aún no tienes asignaciones activas con empresas.
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {slas.map((s) => (
        <Card key={s.assignmentId} className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <ShieldCheck
                  className={`h-4 w-4 ${s.overallOk ? 'text-emerald-600' : 'text-red-600'}`}
                />
                {s.companyName}
              </h3>
              <Badge variant="outline" className="mt-1 text-[10px]">
                {s.type === 'PRIMARY' ? 'Asignación primaria' : 'Backup'}
              </Badge>
            </div>
            <Badge
              variant={s.overallOk ? 'default' : 'destructive'}
              className="text-xs"
            >
              {s.overallOk ? 'OK' : 'En riesgo'}
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            <SlaMetric
              label="Puntualidad (últimos 30 días)"
              pacted={s.slaPunctuality}
              real={s.realPunctuality}
              ok={s.punctualityOk}
              unit="%"
              direction="higher-better"
            />
            <SlaMetric
              label="Tasa de incidencias"
              pacted={s.slaIncidentRate}
              real={s.realIncidentRate}
              ok={s.incidentOk}
              unit="%"
              direction="lower-better"
            />
          </div>

          <div className="mt-3 border-t pt-3 text-xs text-gray-500">
            {s.totalOrders} pedidos · {s.incidents} incidencia{s.incidents === 1 ? '' : 's'}
          </div>
        </Card>
      ))}
    </div>
  )
}

function SlaMetric({
  label,
  pacted,
  real,
  ok,
  unit,
  direction,
}: {
  label: string
  pacted: number | null
  real: number | null
  ok: boolean
  unit: string
  direction: 'higher-better' | 'lower-better'
}) {
  if (pacted === null) {
    return (
      <div className="text-xs">
        <p className="text-gray-500">{label}</p>
        <p className="mt-1 text-gray-400">
          Sin SLA pactado · real: {real ?? '—'}
          {unit}
        </p>
      </div>
    )
  }

  return (
    <div className="text-xs">
      <div className="flex items-center justify-between">
        <p className="text-gray-500">{label}</p>
        <Badge
          variant={ok ? 'default' : 'destructive'}
          className="text-[10px]"
        >
          SLA {direction === 'higher-better' ? '≥' : '≤'} {pacted}
          {unit}
        </Badge>
      </div>
      <p
        className={`mt-1 text-base font-semibold ${
          ok ? 'text-emerald-600' : 'text-red-600'
        }`}
      >
        {real === null ? '—' : `${real}${unit}`}
      </p>
    </div>
  )
}
