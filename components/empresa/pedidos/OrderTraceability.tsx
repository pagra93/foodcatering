'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  MapPin,
  Clock,
  Hash,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Prisma } from '@prisma/client'

type OrderTraceabilityProps = {
  order: {
    id: string
    integrityHash: string
    version: number
    deliveryProof: {
      id?: string
      deliveredAt: Date
      deliveredBy: string | null
      deliveryMethod: string | null
      signatureImageUrl?: string | null
      geoLocation: Prisma.JsonValue | null
      notes: string | null
      verificationHash: string | null
    } | null
  }
}

export function OrderTraceability({ order }: OrderTraceabilityProps) {
  const hasDeliveryProof = !!order.deliveryProof
  const hasGeoLocation = !!order.deliveryProof?.geoLocation

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FileCheck className="h-5 w-5 text-blue-600" />
        Trazabilidad Fiscal
      </h3>

      {/* Estado de Trazabilidad */}
      {hasDeliveryProof ? (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            Este pedido cuenta con justificante de entrega válido y cumple con los
            requisitos fiscales (Art. 45 RIRPF).
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            Este pedido aún no cuenta con justificante de entrega. Se generará
            automáticamente al confirmar la entrega.
          </AlertDescription>
        </Alert>
      )}

      {/* Información de Integridad */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Hash de Integridad */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-medium text-gray-700">Hash de Integridad</p>
          </div>
          <div className="rounded-md bg-gray-50 p-3 font-mono text-xs break-all">
            {order.integrityHash}
          </div>
          <p className="text-xs text-gray-500">
            Versión {order.version} • Garantiza que el pedido no ha sido modificado
          </p>
        </div>

        {/* Información de Entrega */}
        {hasDeliveryProof && order.deliveryProof && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-700">
                  Fecha y Hora de Entrega
                </p>
              </div>
              <p className="text-base text-gray-900">
                {format(
                  new Date(order.deliveryProof.deliveredAt),
                  "d 'de' MMMM, yyyy 'a las' HH:mm",
                  { locale: es }
                )}
              </p>
            </div>

            {order.deliveryProof.deliveredBy && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Entregado Por
                </p>
                <p className="text-base text-gray-900">
                  {order.deliveryProof.deliveredBy}
                </p>
              </div>
            )}

            {order.deliveryProof.deliveryMethod && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Método de Entrega
                </p>
                <Badge variant="outline">
                  {order.deliveryProof.deliveryMethod === 'in_person'
                    ? 'En persona'
                    : order.deliveryProof.deliveryMethod === 'locker'
                      ? 'Locker'
                      : order.deliveryProof.deliveryMethod === 'reception'
                        ? 'Recepción'
                        : order.deliveryProof.deliveryMethod}
                </Badge>
              </div>
            )}

            {hasGeoLocation && order.deliveryProof?.geoLocation && (() => {
              const geo = order.deliveryProof.geoLocation as { lat?: number | string; lng?: number | string }
              return (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <p className="text-sm font-medium text-gray-700">Geolocalización</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {geo.lat}, {geo.lng}
                  </p>
                  <Badge variant="success" className="mt-2">
                    Ubicación verificada
                  </Badge>
                </div>
              )
            })()}

            {order.deliveryProof.notes && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Notas</p>
                <p className="text-sm text-gray-600">{order.deliveryProof.notes}</p>
              </div>
            )}

            {/* Hash de Verificación */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Hash de Verificación
              </p>
              <div className="rounded-md bg-gray-50 p-3 font-mono text-xs break-all">
                {order.deliveryProof.verificationHash}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cumplimiento Fiscal */}
      <div className="mt-6 pt-6 border-t">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Cumplimiento Fiscal
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Pedido Nominativo
              </p>
              <p className="text-xs text-gray-500">
                Asignado a empleado específico
              </p>
            </div>
          </div>

          {hasDeliveryProof && (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Justificante de Entrega
                </p>
                <p className="text-xs text-gray-500">
                  Evidencia de consumo generada
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Hash de Integridad
              </p>
              <p className="text-xs text-gray-500">Datos no modificables</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Trazabilidad Completa
              </p>
              <p className="text-xs text-gray-500">
                Conservación mínima 4 años
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

