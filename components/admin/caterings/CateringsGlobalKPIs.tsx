/**
 * KPIs Globales para la Lista de Caterings
 * Métricas agregadas de todos los caterings
 */

'use client'

import {
  Building2,
  Package,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  Star,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type GlobalKPIs = {
  totalCaterings: number
  activeCaterings: number
  suspendedCaterings: number
  underReviewCaterings: number
  todayOrders: number
  confirmedOrders: number
  deliveredOrders: number
  incidentsOrders: number
  avgPunctuality: number
  openIncidents: number
  expiringDocs: number
  avgRating: number
}

type CateringsGlobalKPIsProps = {
  kpis: GlobalKPIs
}

export function CateringsGlobalKPIs({ kpis }: CateringsGlobalKPIsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Caterings Activos */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Caterings Activos</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-gray-900">
                  {kpis.activeCaterings}
                </p>
                <p className="text-xs text-gray-500">/ {kpis.totalCaterings} total</p>
              </div>
              {kpis.suspendedCaterings > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {kpis.suspendedCaterings} suspendidos
                </p>
              )}
            </div>
            <Building2 className="h-8 w-8 text-blue-400" />
          </div>
        </CardContent>
      </Card>

      {/* Pedidos de Hoy */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Pedidos Hoy</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-green-600">
                  {kpis.deliveredOrders}
                </p>
                <p className="text-xs text-gray-500">/ {kpis.todayOrders}</p>
              </div>
              <div className="flex gap-2 mt-1">
                <p className="text-xs text-blue-600">
                  {kpis.confirmedOrders} confirmados
                </p>
                {kpis.incidentsOrders > 0 && (
                  <p className="text-xs text-red-600">
                    {kpis.incidentsOrders} con incidencia
                  </p>
                )}
              </div>
            </div>
            <Package className="h-8 w-8 text-green-400" />
          </div>
        </CardContent>
      </Card>

      {/* Puntualidad Media */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Puntualidad</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p
                  className={`text-2xl font-bold ${
                    kpis.avgPunctuality >= 95
                      ? 'text-green-600'
                      : kpis.avgPunctuality >= 90
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {kpis.avgPunctuality}%
                </p>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {kpis.avgPunctuality >= 95 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-yellow-600" />
                )}
                <p className="text-xs text-gray-500">Entregas en ventana</p>
              </div>
            </div>
            <Clock className="h-8 w-8 text-purple-400" />
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Alertas Activas</p>
              <div className="flex flex-col gap-1 mt-1">
                {kpis.openIncidents > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <p className="text-sm text-red-600 font-medium">
                      {kpis.openIncidents} incidencias
                    </p>
                  </div>
                )}
                {kpis.expiringDocs > 0 && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-600" />
                    <p className="text-sm text-orange-600 font-medium">
                      {kpis.expiringDocs} docs caducan
                    </p>
                  </div>
                )}
                {kpis.openIncidents === 0 && kpis.expiringDocs === 0 && (
                  <p className="text-sm text-green-600 font-medium">
                    Sin alertas críticas
                  </p>
                )}
              </div>
            </div>
            <AlertCircle
              className={`h-8 w-8 ${
                kpis.openIncidents > 0 || kpis.expiringDocs > 0
                  ? 'text-red-400'
                  : 'text-gray-300'
              }`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

