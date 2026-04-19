'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'

import type { Prisma } from '@prisma/client'

type CateringSLATabProps = {
  tenantId: string
  cateringId: string
  metrics: {
    punctualityRate: number
    incidentRate: number
    slaPunctuality: Prisma.Decimal | number | null
    slaIncidentRate: Prisma.Decimal | number | null
  }
}

type SLAMetrics = {
  last30Days: Array<{ status: string; count: number }>
  thisMonth: Array<{ status: string; count: number }>
  incidentsByType: Array<{ type: string; count: number }>
  ratingDistribution: Array<{ rating: number; count: number }>
}

export function CateringSLATab({
  tenantId,
  cateringId,
  metrics,
}: CateringSLATabProps) {
  const [slaMetrics, setSlaMetrics] = useState<SLAMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSLAMetrics()
  }, [tenantId, cateringId])

  const loadSLAMetrics = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/empresa/catering/sla?tenantId=${tenantId}&cateringId=${cateringId}`
      )
      if (response.ok) {
        const data = await response.json()
        setSlaMetrics(data)
      }
    } catch (error) {
      console.error('Error loading SLA metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const slaPunctualityValue =
    metrics.slaPunctuality !== null && metrics.slaPunctuality !== undefined
      ? Number(metrics.slaPunctuality)
      : 0
  const slaIncidentRateValue =
    metrics.slaIncidentRate !== null && metrics.slaIncidentRate !== undefined
      ? Number(metrics.slaIncidentRate)
      : 0

  const punctualityStatus =
    metrics.punctualityRate >= slaPunctualityValue ? 'success' : 'warning'
  const incidentStatus =
    metrics.incidentRate <= slaIncidentRateValue ? 'success' : 'warning'

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  const totalLast30Days = slaMetrics?.last30Days.reduce(
    (sum, item) => sum + item.count,
    0
  )

  const totalThisMonth = slaMetrics?.thisMonth.reduce(
    (sum, item) => sum + item.count,
    0
  )

  return (
    <div className="space-y-6">
      {/* Resumen de SLA */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Cumplimiento de Puntualidad
            </h3>
            {punctualityStatus === 'success' ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm text-gray-600">Actual</span>
                <span className="text-3xl font-bold text-gray-900">
                  {metrics.punctualityRate.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={metrics.punctualityRate}
                className={
                  punctualityStatus === 'success' ? 'bg-green-100' : 'bg-yellow-100'
                }
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-gray-600">Objetivo SLA</span>
              <span className="text-xl font-semibold text-gray-900">
                {slaPunctualityValue}%
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              {punctualityStatus === 'success' ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Cumple SLA</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-600">Por debajo del SLA</span>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Tasa de Incidencias
            </h3>
            {incidentStatus === 'success' ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm text-gray-600">Actual</span>
                <span className="text-3xl font-bold text-gray-900">
                  {metrics.incidentRate.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={Math.min(metrics.incidentRate, 100)}
                className={
                  incidentStatus === 'success' ? 'bg-green-100' : 'bg-yellow-100'
                }
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-gray-600">Máximo SLA</span>
              <span className="text-xl font-semibold text-gray-900">
                {slaIncidentRateValue}%
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              {incidentStatus === 'success' ? (
                <>
                  <TrendingDown className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Dentro del SLA</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-600">Excede el SLA</span>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Estadísticas Detalladas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Estados de Pedidos */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Estados de Pedidos</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Últimos 30 Días ({totalLast30Days} pedidos)
              </h4>
              <div className="space-y-2">
                {slaMetrics?.last30Days.map((item) => (
                  <OrderStatusBar
                    key={item.status}
                    status={item.status}
                    count={item.count}
                    total={totalLast30Days || 1}
                  />
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Este Mes ({totalThisMonth} pedidos)
              </h4>
              <div className="space-y-2">
                {slaMetrics?.thisMonth.map((item) => (
                  <OrderStatusBar
                    key={item.status}
                    status={item.status}
                    count={item.count}
                    total={totalThisMonth || 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Incidencias por Tipo */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Incidencias por Tipo</h3>
          {slaMetrics && slaMetrics.incidentsByType.length > 0 ? (
            <div className="space-y-3">
              {slaMetrics.incidentsByType.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-gray-900">{item.type}</span>
                  </div>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
              <p className="text-sm">Sin incidencias en los últimos 30 días</p>
            </div>
          )}
        </Card>
      </div>

      {/* Distribución de Valoraciones */}
      {slaMetrics && slaMetrics.ratingDistribution.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Distribución de Valoraciones
          </h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const data = slaMetrics.ratingDistribution.find(
                (r) => r.rating === rating
              )
              const count = data?.count || 0
              const total = slaMetrics.ratingDistribution.reduce(
                (sum, r) => sum + r.count,
                0
              )
              const percentage = total > 0 ? (count / total) * 100 : 0

              return (
                <div key={rating} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-900 w-16">
                    {rating} estrellas
                  </span>
                  <div className="flex-1">
                    <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-yellow-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 w-20 text-right">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function OrderStatusBar({
  status,
  count,
  total,
}: {
  status: string
  count: number
  total: number
}) {
  const percentage = (count / total) * 100

  const statusConfig: Record<
    string,
    { label: string; icon: any; color: string }
  > = {
    DELIVERED: {
      label: 'Entregados',
      icon: CheckCircle2,
      color: 'bg-green-500',
    },
    NO_SHOW: {
      label: 'No recogidos',
      icon: XCircle,
      color: 'bg-yellow-500',
    },
    CANCELLED_BEFORE_CUTOFF: {
      label: 'Cancelados',
      icon: XCircle,
      color: 'bg-gray-500',
    },
    CANCELLED_AFTER_CUTOFF: {
      label: 'Cancelados (tardío)',
      icon: AlertCircle,
      color: 'bg-orange-500',
    },
    ISSUE_REPORTED: {
      label: 'Con incidencia',
      icon: AlertCircle,
      color: 'bg-red-500',
    },
  }

  const config = statusConfig[status] || {
    label: status,
    icon: Clock,
    color: 'bg-gray-400',
  }

  const Icon = config.icon

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-600" />
          <span className="text-sm text-gray-900">{config.label}</span>
        </div>
        <span className="text-sm font-medium text-gray-900">
          {count} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full ${config.color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

