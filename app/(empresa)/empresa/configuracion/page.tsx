import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import { getCompanyConfiguration } from '@/lib/db/queries/empresa-configuracion'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { CalendarDays, Info, Palette, Users, ShieldCheck, ChevronRight } from 'lucide-react'
import { ConfigGeneralTab } from '@/components/empresa/configuracion/ConfigGeneralTab'
import { ConfigPlanTab } from '@/components/empresa/configuracion/ConfigPlanTab'
import { ConfigPreferencesTab } from '@/components/empresa/configuracion/ConfigPreferencesTab'
import { ConfigDocumentationTab } from '@/components/empresa/configuracion/ConfigDocumentationTab'
import { MyDpaCard } from '@/components/shared/MyDpaCard'

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

      {/* Otras secciones de configuración que tienen página propia */}
      <div className="grid gap-3 md:grid-cols-2">
        <Link
          href="/empresa/configuracion/usuarios"
          className="group"
        >
          <Card className="p-5 transition-colors group-hover:bg-gray-50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Usuarios de Gestión</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Administra los accesos de ADMIN_EMPRESA, RRHH, FINANZAS y
                  MANAGER_SEDE. Los empleados están en <code>/empresa/empleados</code>.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Card>
        </Link>

        <Link href="/empresa/configuracion/roles" className="group">
          <Card className="p-5 transition-colors group-hover:bg-gray-50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Roles y Permisos</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Consulta qué puede hacer cada rol en el portal empresa. Los
                  roles son del sistema y no editables desde aquí.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Card>
        </Link>

        <Link href="/empresa/configuracion/branding" className="group">
          <Card className="p-5 transition-colors group-hover:bg-gray-50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Branding</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Personaliza color primario, logo y favicon del portal que
                  ven tus empleados.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Card>
        </Link>

        <Link href="/empresa/configuracion/holidays" className="group">
          <Card className="p-5 transition-colors group-hover:bg-gray-50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Festivos</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Ajusta qué festivos oficiales aplican a tu operativa (24/7
                  pueden desactivarlos) y añade festivos específicos de tu
                  convenio. Afecta al cómputo fiscal IRPF.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Card>
        </Link>
      </div>

      {/* DPA vigente (RGPD Art. 28) */}
      <MyDpaCard tenantId={tenant.id} />
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

