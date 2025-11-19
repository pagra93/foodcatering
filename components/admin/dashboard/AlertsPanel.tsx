/**
 * Panel de alertas críticas del dashboard
 */

import Link from 'next/link'
import { AlertTriangle, FileWarning, TrendingDown, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatDate } from '@/lib/utils'

type AlertsPanelProps = {
  alerts: {
    expiringDocuments: Array<{
      id: string
      documentType: string
      expiryDate: Date
      restaurantName: string
      restaurantId: string
      daysUntilExpiry: number
    }>
    inactiveCaterings: Array<{
      id: string
      name: string
      daysSinceLastOrder: number
    }>
    inactiveCompanies: Array<{
      id: string
      name: string
    }>
    cancellationSpikes: Array<{
      tenantId: string
      tenantName: string
      total: number
      cancelled: number
      percentage: number
    }>
    failedInvoicesCount: number
  }
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const totalAlerts =
    alerts.expiringDocuments.length +
    alerts.inactiveCaterings.length +
    alerts.inactiveCompanies.length +
    alerts.cancellationSpikes.length +
    (alerts.failedInvoicesCount > 0 ? 1 : 0)

  if (totalAlerts === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Alertas del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="mt-4 text-base font-semibold text-gray-900">
              ¡Todo funcionando correctamente!
            </p>
            <p className="mt-1 text-sm text-gray-500">
              No hay alertas críticas en este momento
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Alertas del Sistema
          </CardTitle>
          <Badge variant="destructive" className="h-6 px-2.5">
            {totalAlerts}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* Documentos a punto de vencer */}
        {alerts.expiringDocuments.length > 0 && (
          <Alert variant="warning" className="border-yellow-200 bg-yellow-50">
            <FileWarning className="h-4 w-4" />
            <AlertTitle className="text-yellow-900">
              {alerts.expiringDocuments.length} documento(s) próximo(s) a vencer
            </AlertTitle>
            <AlertDescription className="text-yellow-800">
              <ul className="mt-2 space-y-1">
                {alerts.expiringDocuments.slice(0, 3).map((doc) => (
                  <li key={doc.id} className="text-sm">
                    <Link
                      href={`/admin/tenants/${doc.restaurantId}`}
                      className="hover:underline"
                    >
                      <strong>{doc.restaurantName}</strong> - {doc.documentType}
                      <span className="ml-1 text-xs">
                        (vence en {doc.daysUntilExpiry} días)
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {alerts.expiringDocuments.length > 3 && (
                <Link
                  href="/admin/quality/audits"
                  className="mt-2 inline-block text-sm font-medium hover:underline"
                >
                  Ver todos →
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Caterings inactivos */}
        {alerts.inactiveCaterings.length > 0 && (
          <Alert variant="warning" className="border-yellow-200 bg-yellow-50">
            <TrendingDown className="h-4 w-4" />
            <AlertTitle className="text-yellow-900">
              {alerts.inactiveCaterings.length} catering(s) sin actividad
            </AlertTitle>
            <AlertDescription className="text-yellow-800">
              <ul className="mt-2 space-y-1">
                {alerts.inactiveCaterings.slice(0, 3).map((catering) => (
                  <li key={catering.id} className="text-sm">
                    <Link
                      href={`/admin/tenants/${catering.id}`}
                      className="hover:underline"
                    >
                      <strong>{catering.name}</strong>
                      <span className="ml-1 text-xs">
                        (sin pedidos en 7+ días)
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Empresas inactivas */}
        {alerts.inactiveCompanies.length > 0 && (
          <Alert variant="info" className="border-blue-200 bg-blue-50">
            <TrendingDown className="h-4 w-4" />
            <AlertTitle className="text-blue-900">
              {alerts.inactiveCompanies.length} empresa(s) sin pedidos
            </AlertTitle>
            <AlertDescription className="text-blue-800">
              <ul className="mt-2 space-y-1">
                {alerts.inactiveCompanies.slice(0, 3).map((company) => (
                  <li key={company.id} className="text-sm">
                    <Link
                      href={`/admin/tenants/${company.id}`}
                      className="hover:underline"
                    >
                      {company.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Picos de cancelaciones */}
        {alerts.cancellationSpikes.length > 0 && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-red-900">
              Pico de cancelaciones detectado
            </AlertTitle>
            <AlertDescription className="text-red-800">
              <ul className="mt-2 space-y-1">
                {alerts.cancellationSpikes.map((spike) => (
                  <li key={spike.tenantId} className="text-sm">
                    <Link
                      href={`/admin/tenants/${spike.tenantId}`}
                      className="hover:underline"
                    >
                      <strong>{spike.tenantName}</strong> - {spike.cancelled}/
                      {spike.total} cancelados ({spike.percentage}%)
                    </Link>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Errores de facturación */}
        {alerts.failedInvoicesCount > 0 && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4" />
            <AlertTitle className="text-red-900">
              {alerts.failedInvoicesCount} factura(s) con errores
            </AlertTitle>
            <AlertDescription className="text-red-800">
              <Link
                href="/admin/billing"
                className="text-sm font-medium hover:underline"
              >
                Revisar facturas fallidas →
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

