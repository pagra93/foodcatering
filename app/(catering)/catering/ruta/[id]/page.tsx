/**
 * Página: Vista Móvil de Ruta (Repartidor)
 * Ruta: /catering/ruta/[id]
 *
 * Server Component: carga la ruta con `getRouteById()`, normaliza los
 * datos a la forma que espera `DeliveryMobileView` y delega la
 * interactividad (iniciar, completar, confirmar entregas, reportar
 * incidencias) a `DeliveryRouteView` (client component) que ejecuta
 * Server Actions.
 */

import { notFound, redirect } from 'next/navigation'
import { getRequiredSession } from '@/lib/auth/session'
import { getRouteById } from '@/lib/db/queries/catering-routes'
import { DeliveryRouteView } from '@/components/catering/delivery/DeliveryRouteView'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function DeliveryRoutePage({ params }: PageProps) {
  const session = await getRequiredSession()

  if (session.user.tenantType !== 'CATERING') {
    redirect('/unauthorized')
  }

  const { id } = await params
  const route = await getRouteById(session.user.tenantId, id)

  if (!route) {
    notFound()
  }

  // REPARTIDOR sólo puede ver su propia ruta
  if (
    session.user.role === 'REPARTIDOR' &&
    route.deliveryUser?.id !== session.user.id
  ) {
    redirect('/unauthorized')
  }

  // Normalizar la forma al contrato de `DeliveryMobileView.stops`
  const stops = route.sites.map((site) => {
    const siteOrders = route.orders.filter(
      (order) => order.siteId === site.companySiteId
    )

    return {
      site: {
        id: site.companySite.id,
        name: site.companySite.name,
        address: site.companySite.address,
        contactName: site.companySite.contactName,
        contactPhone: site.companySite.contactPhone,
        latitude: site.companySite.latitude
          ? Number(site.companySite.latitude)
          : null,
        longitude: site.companySite.longitude
          ? Number(site.companySite.longitude)
          : null,
        company: {
          name: site.companySite.company.legalName,
        },
      },
      sequence: site.sequence,
      orders: siteOrders.map((order) => ({
        id: order.id,
        employeeName: order.employee?.name ?? 'Empleado',
        employeePhone: order.employee?.phone ?? null,
        employeeAllergies: null,
        status: order.status,
        notes: order.notes,
      })),
      totalOrders: siteOrders.length,
      deliveredOrders: siteOrders.filter((o) => o.status === 'DELIVERED').length,
      pendingOrders: siteOrders.filter((o) => o.status === 'CONFIRMED').length,
    }
  })

  return (
    <DeliveryRouteView
      route={{
        id: route.id,
        name: route.name,
        date: route.date,
        status: route.status,
      }}
      stops={stops}
    />
  )
}
