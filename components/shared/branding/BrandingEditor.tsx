'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, Eye, Palette, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateOwnBrandingAction } from './actions'
import { contrastText } from '@/lib/branding/colors'

type Props = {
  tenantName: string
  initial: {
    primaryColor: string | null
    secondaryColor: string | null
    logoUrl: string | null
    faviconUrl: string | null
  }
  systemDefaults: {
    defaultPrimaryColor: string
    defaultSecondaryColor: string | null
    defaultLogoUrl: string | null
    brandName: string
  }
}

export function BrandingEditor({ tenantName, initial, systemDefaults }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor ?? '')
  const [secondaryColor, setSecondaryColor] = useState(
    initial.secondaryColor ?? ''
  )
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? '')
  const [faviconUrl, setFaviconUrl] = useState(initial.faviconUrl ?? '')

  const effectivePrimary = primaryColor || systemDefaults.defaultPrimaryColor
  const effectiveFg = contrastText(effectivePrimary)
  const effectiveLogo = logoUrl || systemDefaults.defaultLogoUrl

  const reset = () => {
    if (!confirm('¿Volver a los defaults del sistema? Perderás tu personalización.'))
      return
    setPrimaryColor('')
    setSecondaryColor('')
    setLogoUrl('')
    setFaviconUrl('')
  }

  const save = () => {
    startTransition(async () => {
      try {
        await updateOwnBrandingAction({
          primaryColor: primaryColor || null,
          secondaryColor: secondaryColor || null,
          logoUrl: logoUrl || null,
          faviconUrl: faviconUrl || null,
        })
        toast.success('Branding guardado. Recarga la página para ver los cambios completos.')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Formulario */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-4 w-4 text-gray-600" />
          <h3 className="text-base font-semibold">Personalización</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="primaryColor">Color primario</Label>
            <div className="mt-1 flex gap-2">
              <input
                id="primaryColor"
                type="color"
                value={primaryColor || systemDefaults.defaultPrimaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded-md border border-gray-200"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder={systemDefaults.defaultPrimaryColor}
                className="font-mono"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Se usa en botones, enlaces activos y acentos del portal. Dejar
              vacío usa el default del sistema (
              {systemDefaults.defaultPrimaryColor}).
            </p>
          </div>

          <div>
            <Label htmlFor="secondaryColor">Color secundario (opcional)</Label>
            <div className="mt-1 flex gap-2">
              <input
                id="secondaryColor"
                type="color"
                value={secondaryColor || '#8B5CF6'}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded-md border border-gray-200"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#8B5CF6"
                className="font-mono"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="logoUrl">URL del logo</Label>
            <Input
              id="logoUrl"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://mi-empresa.com/logo.png"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">
              Se muestra en la parte superior izquierda del sidebar. Tamaño
              recomendado: 80×80 px, PNG transparente.
            </p>
          </div>

          <div>
            <Label htmlFor="faviconUrl">URL del favicon</Label>
            <Input
              id="faviconUrl"
              type="url"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              placeholder="https://mi-empresa.com/favicon.ico"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">
              Favicon del navegador. Formato .ico, .png o .svg (32×32 o 64×64 px).
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-between border-t pt-4">
          <Button variant="ghost" size="sm" onClick={reset} disabled={isPending}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Resetear a defaults
          </Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? 'Guardando…' : 'Guardar branding'}
          </Button>
        </div>
      </Card>

      {/* Preview */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-gray-50 p-3">
          <Eye className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-semibold">Vista previa en vivo</h3>
        </div>
        <div className="p-4">
          <p className="mb-3 text-xs text-gray-500">
            Así se verá tu portal con estos ajustes (el cambio real se aplica
            al pulsar Guardar y recargar):
          </p>

          {/* Simulación mini-sidebar */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 border-b bg-white p-4">
              {effectiveLogo ? (
                <img
                  src={effectiveLogo}
                  alt={tenantName}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg font-bold"
                  style={{
                    backgroundColor: effectivePrimary,
                    color: effectiveFg,
                  }}
                >
                  <Building2 className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold">{tenantName}</p>
                <p className="text-xs text-gray-500">portal</p>
              </div>
            </div>

            <div className="space-y-1 bg-white p-2">
              <div
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium"
                style={{
                  backgroundColor: effectivePrimary + '15',
                  color: effectivePrimary,
                }}
              >
                <span className="h-4 w-4 rounded-sm" style={{ backgroundColor: effectivePrimary }} />
                Dashboard (activo)
              </div>
              <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700">
                <span className="h-4 w-4 rounded-sm bg-gray-300" />
                Otra sección
              </div>
              <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700">
                <span className="h-4 w-4 rounded-sm bg-gray-300" />
                Otra sección
              </div>
            </div>

            <div className="border-t bg-white p-3">
              <button
                type="button"
                className="w-full rounded-md px-3 py-2 text-sm font-medium"
                style={{
                  backgroundColor: effectivePrimary,
                  color: effectiveFg,
                }}
              >
                Botón primario
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-md bg-gray-50 p-3 text-xs text-gray-600">
            <p>
              <strong>Color efectivo:</strong>{' '}
              <code className="font-mono">{effectivePrimary}</code>
              {!primaryColor && ' (default del sistema)'}
            </p>
            <p className="mt-1">
              <strong>Texto sobre el primario:</strong>{' '}
              <code className="font-mono">{effectiveFg}</code>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
