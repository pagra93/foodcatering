'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateSystemSettingsAction } from '@/components/shared/branding/actions'

type Props = {
  initial: {
    defaultPrimaryColor: string
    defaultSecondaryColor: string | null
    defaultLogoUrl: string | null
    defaultFaviconUrl: string | null
    brandName: string
  }
}

export function SystemDefaultsEditor({ initial }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [primary, setPrimary] = useState(initial.defaultPrimaryColor)
  const [secondary, setSecondary] = useState(initial.defaultSecondaryColor ?? '')
  const [logo, setLogo] = useState(initial.defaultLogoUrl ?? '')
  const [favicon, setFavicon] = useState(initial.defaultFaviconUrl ?? '')
  const [brandName, setBrandName] = useState(initial.brandName)

  const save = () => {
    startTransition(async () => {
      const res = await updateSystemSettingsAction({
        defaultPrimaryColor: primary,
        defaultSecondaryColor: secondary || null,
        defaultLogoUrl: logo || null,
        defaultFaviconUrl: favicon || null,
        brandName,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Defaults del sistema actualizados')
      router.refresh()
    })
  }

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold">Defaults del sistema</h3>
      <p className="mt-1 text-sm text-gray-500">
        Valores que heredan los tenants que no personalizan su branding. Y
        también el propio portal admin de Plati.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Nombre de la marca</Label>
          <Input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-gray-500">
            Aparece en el portal empleado y en emails.
          </p>
        </div>

        <div>
          <Label>Color primario default</Label>
          <div className="mt-1 flex gap-2">
            <input
              type="color"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="h-10 w-20 cursor-pointer rounded-md border border-gray-200"
            />
            <Input
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        <div>
          <Label>Color secundario default</Label>
          <div className="mt-1 flex gap-2">
            <input
              type="color"
              value={secondary || '#8B5CF6'}
              onChange={(e) => setSecondary(e.target.value)}
              className="h-10 w-20 cursor-pointer rounded-md border border-gray-200"
            />
            <Input
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              placeholder="opcional"
              className="font-mono"
            />
          </div>
        </div>

        <div>
          <Label>URL logo default</Label>
          <Input
            type="url"
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            placeholder="https://..."
            className="mt-1"
          />
        </div>

        <div>
          <Label>URL favicon default</Label>
          <Input
            type="url"
            value={favicon}
            onChange={(e) => setFavicon(e.target.value)}
            placeholder="https://..."
            className="mt-1"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end border-t pt-4">
        <Button onClick={save} disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? 'Guardando…' : 'Guardar defaults'}
        </Button>
      </div>
    </Card>
  )
}
