import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/db/prisma'
import { DeliveryZonesManager } from '@/components/catering/catalogs/DeliveryZonesManager'

export default async function CateringZonesPage() {
  const session = (await auth()) as Session | null
  if (!session?.user?.tenantId) redirect('/login')

  const zones = await prisma.deliveryZone.findMany({
    where: { tenantCatering: session.user.tenantId },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/catering/configuracion">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Configuración
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Zonas de reparto</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Agrupa códigos postales por zona, con distancia máxima y notas
          operativas. El sistema las usa para enrutar pedidos al catering
          correcto.
        </p>
      </div>

      <DeliveryZonesManager zones={zones} />
    </div>
  )
}
