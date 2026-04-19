import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  getSystemSettings,
  getTenantBranding,
} from '@/lib/db/queries/branding'
import { BrandingEditor } from '@/components/shared/branding/BrandingEditor'

export default async function CateringBrandingPage() {
  const session = (await auth()) as Session | null
  if (!session?.user?.tenantId) redirect('/login')

  const [tenant, system] = await Promise.all([
    getTenantBranding(session.user.tenantId),
    getSystemSettings(),
  ])

  if (!tenant) redirect('/login')

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
        <h1 className="text-2xl font-bold">Branding</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Personaliza el color primario, logo y favicon de tu portal
          catering. Los cambios afectan a todo tu equipo cuando entran a
          trabajar.
        </p>
      </div>

      <BrandingEditor
        tenantName={tenant.name}
        initial={{
          primaryColor: tenant.primaryColor,
          secondaryColor: tenant.secondaryColor,
          logoUrl: tenant.logoUrl,
          faviconUrl: tenant.faviconUrl,
        }}
        systemDefaults={{
          defaultPrimaryColor: system.defaultPrimaryColor,
          defaultSecondaryColor: system.defaultSecondaryColor,
          defaultLogoUrl: system.defaultLogoUrl,
          brandName: system.brandName,
        }}
      />
    </div>
  )
}
