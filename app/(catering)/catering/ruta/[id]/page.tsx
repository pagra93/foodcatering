/**
 * Página: Vista Móvil de Ruta (Repartidor)
 * Ruta: /catering/ruta/[id]
 * 
 * Vista optimizada para móviles (repartidores en la calle)
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeliveryMobileView } from '@/components/catering/delivery/DeliveryMobileView'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, PlayCircle, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type PageProps = {
  params: {
    id: string
  }
}

export default function DeliveryRoutePage({ params }: PageProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const fetchRoute = async () => {
    try {
      const response = await fetch(`/api/catering/rutas/${params.id}`)

      if (!response.ok) {
        throw new Error('Error al cargar la ruta')
      }

      const result = await response.json()

      // Formatear datos para DeliveryMobileView
      const stops = result.data.sites.map((site: any) => {
        const siteOrders = result.data.orders.filter(
          (order: any) => order.companySite.id === site.id
        )

        return {
          site: {
            id: site.id,
            name: site.name,
            address: site.address,
            contactName: site.contactName,
            contactPhone: site.contactPhone,
            latitude: site.latitude,
            longitude: site.longitude,
            company: site.company,
          },
          sequence: site.sequence,
          orders: siteOrders.map((order: any) => ({
            id: order.id,
            employeeName: `${order.employee.firstName} ${order.employee.lastName}`,
            employeePhone: order.employee.phone,
            employeeAllergies: order.employee.allergies,
            status: order.status,
            notes: order.notes,
          })),
          totalOrders: siteOrders.length,
          deliveredOrders: siteOrders.filter((o: any) => o.status === 'DELIVERED')
            .length,
          pendingOrders: siteOrders.filter((o: any) => o.status === 'CONFIRMED')
            .length,
        }
      })

      setData({
        route: {
          id: result.data.id,
          name: result.data.name,
          date: result.data.date,
          status: result.data.status,
        },
        stops,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoute()
    // Auto-refresh cada 30 segundos
    const interval = setInterval(fetchRoute, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const handleStartRoute = async () => {
    try {
      const response = await fetch(`/api/catering/rutas/${params.id}/iniciar`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Error al iniciar la ruta')
      }

      toast({
        title: 'Ruta iniciada',
        description: 'La ruta ha comenzado correctamente',
      })

      fetchRoute()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la ruta',
        variant: 'destructive',
      })
    }
  }

  const handleCompleteRoute = async () => {
    try {
      const response = await fetch(`/api/catering/rutas/${params.id}/completar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Error al completar la ruta')
      }

      toast({
        title: 'Ruta completada',
        description: 'La ruta se ha completado correctamente',
      })

      router.push('/catering/rutas')
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'No se pudo completar la ruta',
        variant: 'destructive',
      })
    }
  }

  const handleConfirmDelivery = async (orderId: string) => {
    const response = await fetch('/api/catering/entregas/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        deliveredAt: new Date().toISOString(),
        proofType: 'NONE',
      }),
    })

    if (!response.ok) {
      throw new Error('Error al confirmar entrega')
    }

    // Recargar datos
    fetchRoute()
  }

  const handleReportIncident = async (
    orderId: string,
    type: string,
    description: string
  ) => {
    const response = await fetch('/api/catering/entregas/incidencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        type,
        description,
      }),
    })

    if (!response.ok) {
      throw new Error('Error al reportar incidencia')
    }

    // Recargar datos
    fetchRoute()
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Cargando ruta...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="p-6 max-w-md w-full">
          <div className="text-center">
            <p className="text-red-600 font-semibold mb-4">Error</p>
            <p className="text-gray-700 mb-6">{error || 'Ruta no encontrada'}</p>
            <Button onClick={() => router.back()}>Volver</Button>
          </div>
        </Card>
      </div>
    )
  }

  // Vista para iniciar ruta
  if (data.route.status === 'PENDING') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="p-6 max-w-md w-full">
          <div className="text-center">
            <PlayCircle className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {data.route.name}
            </h2>
            <p className="text-gray-600 mb-6">
              {data.stops.length} parada{data.stops.length !== 1 ? 's' : ''}
              {' · '}
              {data.stops.reduce(
                (sum: number, stop: any) => sum + stop.totalOrders,
                0
              )}{' '}
              pedidos
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

  // Vista para completar ruta
  if (
    data.route.status === 'IN_PROGRESS' &&
    data.stops.every((stop: any) => stop.pendingOrders === 0)
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
      route={data.route}
      stops={data.stops}
      onConfirmDelivery={handleConfirmDelivery}
      onReportIncident={handleReportIncident}
    />
  )
}

