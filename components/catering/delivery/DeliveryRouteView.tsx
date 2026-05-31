/**
 * Vista cliente de la ruta móvil del repartidor.
 *
 * Recibe los datos ya formateados desde el Server Component padre
 * (`/catering/ruta/[id]`). Mantiene la interactividad (iniciar /
 * completar ruta, confirmar entrega, reportar incidencia) y un
 * auto-refresh suave vía `router.refresh()` cada 30 segundos para
 * simular el polling original sin volver a hacer fetch al cliente.
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DeliveryMobileView } from '@/components/catering/delivery/DeliveryMobileView'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PlayCircle, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  completeRouteAction,
  confirmDeliveryAction,
  reportIncidentAction,
  startRouteAction,
} from './actions'

type Stop = React.ComponentProps<typeof DeliveryMobileView>['stops'][number]
type RouteInfo = React.ComponentProps<typeof DeliveryMobileView>['route']

type DeliveryRouteViewProps = {
  route: RouteInfo
  stops: Stop[]
}

export function DeliveryRouteView({ route, stops }: DeliveryRouteViewProps) {
  const router = useRouter()
  const { toast } = useToast()

  // Auto-refresh periódico (sustituto del polling original con fetch)
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 30000)
    return () => clearInterval(interval)
  }, [router])

  const handleStartRoute = async () => {
    const res = await startRouteAction(route.id)
    if (!res.success) {
      toast({
        title: 'Error',
        description: res.error,
        variant: 'destructive',
      })
      return
    }
    toast({
      title: 'Ruta iniciada',
      description: 'La ruta ha comenzado correctamente',
    })
    router.refresh()
  }

  const handleCompleteRoute = async () => {
    const res = await completeRouteAction(route.id)
    if (!res.success) {
      toast({
        title: 'Error',
        description: res.error,
        variant: 'destructive',
      })
      return
    }
    toast({
      title: 'Ruta completada',
      description: 'La ruta se ha completado correctamente',
    })
    router.push('/catering/rutas')
  }

  const handleConfirmDelivery = async (orderId: string) => {
    const res = await confirmDeliveryAction(route.id, {
      orderId,
      deliveredAt: new Date(),
      proofType: 'NONE',
    })
    if (!res.success) {
      throw new Error(res.error)
    }
    router.refresh()
  }

  const handleReportIncident = async (
    orderId: string,
    type: string,
    description: string
  ) => {
    const res = await reportIncidentAction(route.id, {
      orderId,
      // Los tipos aceptados por el schema vienen del enum de validación.
      // El caller sólo nos pasa un string, lo adaptamos aquí.
      type: type as 'ADDRESS_NOT_FOUND'
        | 'RECIPIENT_NOT_AVAILABLE'
        | 'ACCESS_DENIED'
        | 'DAMAGED_PRODUCT'
        | 'WRONG_ORDER'
        | 'OTHER',
      description,
    })
    if (!res.success) {
      throw new Error(res.error)
    }
    router.refresh()
  }

  // Vista para iniciar ruta
  if (route.status === 'PENDING') {
    const totalOrders = stops.reduce((sum, stop) => sum + stop.totalOrders, 0)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="p-6 max-w-md w-full">
          <div className="text-center">
            <PlayCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {route.name}
            </h2>
            <p className="text-gray-600 mb-6">
              {stops.length} parada{stops.length !== 1 ? 's' : ''} ·{' '}
              {totalOrders} pedidos
            </p>
            <Button onClick={handleStartRoute} size="lg" className="w-full">
              <PlayCircle className="h-5 w-5 mr-2" />
              Iniciar Ruta
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Vista para completar ruta (en progreso, sin pendientes)
  if (
    route.status === 'IN_PROGRESS' &&
    stops.every((stop) => stop.pendingOrders === 0)
  ) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="p-6 max-w-md w-full">
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Todas las entregas completadas!
            </h2>
            <p className="text-gray-600 mb-6">
              Puedes finalizar la ruta ahora
            </p>
            <Button
              onClick={handleCompleteRoute}
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Completar Ruta
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Vista principal (en curso)
  return (
    <DeliveryMobileView
      route={route}
      stops={stops}
      onConfirmDelivery={handleConfirmDelivery}
      onReportIncident={handleReportIncident}
    />
  )
}
