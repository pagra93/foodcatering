/**
 * Componente: Vista Móvil para Repartidores
 * 
 * Optimizado para móviles (en la calle)
 * - Lista de paradas
 * - Confirmar entregas
 * - Reportar incidencias
 * - Botones grandes táctiles
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  MapPin,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Navigation,
} from 'lucide-react'

type Stop = {
  site: {
    id: string
    name: string
    address: string
    contactName: string | null
    contactPhone: string | null
    latitude: number | null
    longitude: number | null
    company: {
      name: string
    }
  }
  sequence: number
  orders: Array<{
    id: string
    employeeName: string
    employeePhone: string | null
    employeeAllergies: string[] | null
    status: string
    notes: string | null
  }>
  totalOrders: number
  deliveredOrders: number
  pendingOrders: number
}

type DeliveryMobileViewProps = {
  route: {
    id: string
    name: string
    date: Date
    status: string
  }
  stops: Stop[]
  onConfirmDelivery: (orderId: string) => Promise<void>
  onReportIncident: (orderId: string, type: string, description: string) => Promise<void>
}

export function DeliveryMobileView({
  route,
  stops,
  onConfirmDelivery,
  onReportIncident: _onReportIncident,
}: DeliveryMobileViewProps) {
  const [expandedStop, setExpandedStop] = useState<number | null>(null)
  const [confirmingOrder, setConfirmingOrder] = useState<string | null>(null)
  const [reportingOrder, setReportingOrder] = useState<string | null>(null)
  const { toast } = useToast()

  const totalOrders = stops.reduce((sum, stop) => sum + stop.totalOrders, 0)
  const deliveredOrders = stops.reduce((sum, stop) => sum + stop.deliveredOrders, 0)
  const progress = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0

  const handleConfirm = async (orderId: string) => {
    try {
      await onConfirmDelivery(orderId)
      setConfirmingOrder(null)
      toast({
        title: 'Entrega confirmada',
        description: 'La entrega se ha confirmado correctamente',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo confirmar la entrega',
        variant: 'destructive',
      })
    }
  }

  const openMaps = (address: string, lat?: number | null, lng?: number | null) => {
    if (lat && lng) {
      // iOS y Android Maps
      window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank')
    } else {
      // Fallback a búsqueda por dirección
      window.open(
        `https://maps.google.com/?q=${encodeURIComponent(address)}`,
        '_blank'
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header fijo */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{route.name}</h1>
              <p className="text-sm text-gray-600">
                {stops.length} parada{stops.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Badge
              className="text-base px-3 py-1"
              variant={route.status === 'IN_PROGRESS' ? 'default' : 'secondary'}
            >
              {route.status === 'IN_PROGRESS' ? 'En Curso' : route.status}
            </Badge>
          </div>

          {/* Barra de progreso */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">
                {deliveredOrders} / {totalOrders} entregados
              </span>
              <span className="text-gray-600">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de paradas */}
      <div className="px-4 py-4 space-y-4">
        {stops.map((stop) => {
          const isExpanded = expandedStop === stop.sequence
          const isCompleted = stop.pendingOrders === 0

          return (
            <Card
              key={stop.sequence}
              className={`overflow-hidden ${
                isCompleted ? 'border-green-300 bg-green-50' : ''
              }`}
            >
              {/* Header de parada */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedStop(isExpanded ? null : stop.sequence)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl font-bold text-gray-900">
                        #{stop.sequence}
                      </span>
                      {isCompleted && (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {stop.site.company.name}
                    </h3>
                    <p className="text-sm text-gray-600">{stop.site.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {stop.totalOrders}
                    </p>
                    <p className="text-xs text-gray-600">pedidos</p>
                  </div>
                </div>

                {/* Dirección */}
                <div className="flex items-start gap-2 mt-3 text-sm text-gray-700">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="flex-1">{stop.site.address}</p>
                </div>

                {/* Botón navegación */}
                <Button
                  className="w-full mt-3"
                  variant="outline"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation()
                    openMaps(
                      stop.site.address,
                      stop.site.latitude,
                      stop.site.longitude
                    )
                  }}
                >
                  <Navigation className="h-5 w-5 mr-2" />
                  Navegar
                </Button>
              </div>

              {/* Lista de pedidos (expandible) */}
              {isExpanded && (
                <div className="border-t bg-white">
                  {stop.orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 border-b last:border-b-0"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {order.employeeName}
                          </p>
                          {order.employeePhone && (
                            <a
                              href={`tel:${order.employeePhone}`}
                              className="text-sm text-primary flex items-center gap-1 mt-1"
                            >
                              <Phone className="h-3 w-3" />
                              {order.employeePhone}
                            </a>
                          )}
                        </div>
                        <Badge
                          variant={
                            order.status === 'DELIVERED' ? 'default' : 'secondary'
                          }
                        >
                          {order.status === 'DELIVERED' ? 'Entregado' : 'Pendiente'}
                        </Badge>
                      </div>

                      {/* Alergias */}
                      {order.employeeAllergies && order.employeeAllergies.length > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded mt-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <p className="text-sm font-medium text-red-900">
                            Alergias: {order.employeeAllergies.join(', ')}
                          </p>
                        </div>
                      )}

                      {/* Notas */}
                      {order.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          Nota: {order.notes}
                        </p>
                      )}

                      {/* Acciones */}
                      {order.status !== 'DELIVERED' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            className="flex-1"
                            size="lg"
                            onClick={() => setConfirmingOrder(order.id)}
                          >
                            <CheckCircle2 className="h-5 w-5 mr-2" />
                            Confirmar
                          </Button>
                          <Button
                            className="flex-1"
                            variant="destructive"
                            size="lg"
                            onClick={() => setReportingOrder(order.id)}
                          >
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            Incidencia
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Dialog de confirmación */}
      <Dialog
        open={confirmingOrder !== null}
        onOpenChange={() => setConfirmingOrder(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Entrega</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Confirmas que este pedido fue entregado correctamente?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmingOrder(null)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() =>
                  confirmingOrder && handleConfirm(confirmingOrder)
                }
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de incidencia - Simplificado */}
      <Dialog
        open={reportingOrder !== null}
        onOpenChange={() => setReportingOrder(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar Incidencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Funcionalidad de reporte de incidencias disponible próximamente.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setReportingOrder(null)}
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

