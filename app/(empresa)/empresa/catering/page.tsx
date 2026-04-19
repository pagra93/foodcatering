import { Suspense } from 'react'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import { getAssignedCatering } from '@/lib/db/queries/empresa-catering'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { CateringInfoTab } from '@/components/empresa/catering/CateringInfoTab'
import { CateringMenusTab } from '@/components/empresa/catering/CateringMenusTab'
import { CateringSLATab } from '@/components/empresa/catering/CateringSLATab'
import { CateringRatingsTab } from '@/components/empresa/catering/CateringRatingsTab'

/**
 * Página de gestión de Catering
 * FASE 5 - Información, menús, SLA, valoraciones
 */

async function CateringData() {
  const tenant = await getCurrentTenant()
  const catering = await getAssignedCatering(tenant.id)

  if (!catering || !catering.restaurant) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No hay ningún catering asignado a tu empresa. Contacta con el
          administrador para configurar tu servicio de comidas.
        </AlertDescription>
      </Alert>
    )
  }

  const restaurant = catering.restaurant

  return (
    <>
      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="menus">Menús</TabsTrigger>
          <TabsTrigger value="sla">SLA y Calidad</TabsTrigger>
          <TabsTrigger value="ratings">Valoraciones</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <CateringInfoTab
            restaurant={restaurant}
            assignment={catering.assignment}
            metrics={catering.metrics}
          />
        </TabsContent>

        <TabsContent value="menus">
          <CateringMenusTab cateringId={restaurant.id} />
        </TabsContent>

        <TabsContent value="sla">
          <CateringSLATab
            tenantId={tenant.id}
            cateringId={restaurant.id}
            metrics={catering.metrics}
          />
        </TabsContent>

        <TabsContent value="ratings">
          <CateringRatingsTab
            tenantId={tenant.id}
            cateringId={restaurant.id}
          />
        </TabsContent>
      </Tabs>
    </>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default async function CateringPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Catering y Menús</h1>
        <p className="mt-1 text-sm text-gray-500">
          Información de tu catering asignado, menús disponibles y métricas de calidad
        </p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <CateringData />
      </Suspense>
    </div>
  )
}

