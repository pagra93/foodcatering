import { Suspense } from 'react'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import { getCompanyConfiguration } from '@/lib/db/queries/empresa-configuracion'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import { ConfigGeneralTab } from '@/components/empresa/configuracion/ConfigGeneralTab'
import { ConfigPlanTab } from '@/components/empresa/configuracion/ConfigPlanTab'
import { ConfigPreferencesTab } from '@/components/empresa/configuracion/ConfigPreferencesTab'
import { ConfigDocumentationTab } from '@/components/empresa/configuracion/ConfigDocumentationTab'

/**
 * Página de Configuración de Empresa
 * FASE 4 - Información general, plan, preferencias, documentación
 */

async function ConfigurationData() {
  const tenant = await getCurrentTenant()
  const config = await getCompanyConfiguration(tenant.id)

  if (!config) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          No se pudo cargar la configuración de la empresa
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      {/* Alert informativo */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Los cambios en la configuración pueden afectar a todos los empleados y
          pedidos. Se guardará un historial de cambios para auditoría.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="plan">Plan y Límites</TabsTrigger>
          <TabsTrigger value="preferencias">Preferencias</TabsTrigger>
          <TabsTrigger value="documentacion">Documentación</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <ConfigGeneralTab company={config.company} sites={config.sites} />
        </TabsContent>

        <TabsContent value="plan">
          <ConfigPlanTab policy={config.policy} />
        </TabsContent>

        <TabsContent value="preferencias">
          <ConfigPreferencesTab settings={config.settings} />
        </TabsContent>

        <TabsContent value="documentacion">
          <ConfigDocumentationTab company={config.company} />
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

export default async function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona la información, plan y preferencias de tu empresa
        </p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <ConfigurationData />
      </Suspense>
    </div>
  )
}

