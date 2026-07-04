import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getAllTenantsBranding,
  getSystemSettings,
} from '@/lib/db/queries/branding'
import { SystemDefaultsEditor } from '@/components/admin/templates/branding/SystemDefaultsEditor'
import { TenantBrandingManager } from '@/components/admin/templates/branding/TenantBrandingManager'

export default async function AdminBrandingPage() {
  const [system, tenants] = await Promise.all([
    getSystemSettings(),
    getAllTenantsBranding(),
  ])

  const personalized = tenants.filter(
    (t) => t.primaryColor || t.logoUrl
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Plantillas
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Branding</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Configuración de branding a nivel sistema y visibilidad de lo que
          ha personalizado cada tenant. Si un tenant no tiene branding, hereda
          de los defaults.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Tenants totales</p>
          <p className="mt-1 text-2xl font-bold">{tenants.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Con branding personalizado</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {personalized}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Usando defaults</p>
          <p className="mt-1 text-2xl font-bold text-gray-600">
            {tenants.length - personalized}
          </p>
        </Card>
      </div>

      <SystemDefaultsEditor
        initial={{
          defaultPrimaryColor: system.defaultPrimaryColor,
          defaultSecondaryColor: system.defaultSecondaryColor,
          defaultLogoUrl: system.defaultLogoUrl,
          defaultFaviconUrl: system.defaultFaviconUrl,
          brandName: system.brandName,
        }}
      />

      <TenantBrandingManager
        tenants={tenants.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          subdomain: t.subdomain,
          primaryColor: t.primaryColor,
          secondaryColor: t.secondaryColor,
          logoUrl: t.logoUrl,
          faviconUrl: t.faviconUrl,
        }))}
      />
    </div>
  )
}
