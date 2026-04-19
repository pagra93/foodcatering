import Link from 'next/link'
import { ArrowLeft, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getAllTenantsBranding,
  getSystemSettings,
} from '@/lib/db/queries/branding'
import { SystemDefaultsEditor } from '@/components/admin/templates/branding/SystemDefaultsEditor'

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

      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50 p-4">
          <h3 className="text-base font-semibold">Branding por tenant</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Para editar el branding de un tenant concreto, usa impersonación
            o pídele al ADMIN_EMPRESA / ADMIN_CATERING que lo haga desde su
            portal.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Tenant</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Color primario</th>
              <th className="px-4 py-3 text-center">Secundario</th>
              <th className="px-4 py-3 text-center">Logo</th>
              <th className="px-4 py-3 text-center">Favicon</th>
              <th className="px-4 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => {
              const personalized =
                t.primaryColor ||
                t.logoUrl ||
                t.secondaryColor ||
                t.faviconUrl
              return (
                <tr
                  key={t.id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.name}</div>
                    <div className="font-mono text-[10px] text-gray-500">
                      {t.subdomain}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">
                      {t.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {t.primaryColor ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded border border-gray-200"
                          style={{ backgroundColor: t.primaryColor }}
                        />
                        <span className="font-mono text-xs">
                          {t.primaryColor}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">default</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.secondaryColor ? (
                      <div
                        className="inline-block h-5 w-5 rounded border border-gray-200"
                        style={{ backgroundColor: t.secondaryColor }}
                        title={t.secondaryColor}
                      />
                    ) : (
                      <X className="inline h-4 w-4 text-gray-300" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.logoUrl ? (
                      <Check className="inline h-4 w-4 text-emerald-600" />
                    ) : (
                      <X className="inline h-4 w-4 text-gray-300" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.faviconUrl ? (
                      <Check className="inline h-4 w-4 text-emerald-600" />
                    ) : (
                      <X className="inline h-4 w-4 text-gray-300" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {personalized ? (
                      <Badge variant="default" className="text-[10px]">
                        Personalizado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Defaults
                      </Badge>
                    )}
                  </td>
                </tr>
              )
            })}
            {tenants.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay tenants activos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
