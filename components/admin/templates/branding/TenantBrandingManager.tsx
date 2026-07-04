'use client'

/**
 * Tabla de branding por tenant con edición desde el admin (super admin edita
 * cualquier tenant). Cablea la acción ya existente overrideTenantBrandingAction.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { overrideTenantBrandingAction } from '@/components/shared/branding/actions'

export type TenantBrandingRow = {
  id: string
  name: string
  type: string
  subdomain: string
  primaryColor: string | null
  secondaryColor: string | null
  logoUrl: string | null
  faviconUrl: string | null
}

type FormState = {
  tenantId: string
  name: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string
  faviconUrl: string
}

export function TenantBrandingManager({ tenants }: { tenants: TenantBrandingRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState | null>(null)

  const openEdit = (t: TenantBrandingRow) => {
    setError(null)
    setForm({
      tenantId: t.id,
      name: t.name,
      primaryColor: t.primaryColor ?? '',
      secondaryColor: t.secondaryColor ?? '',
      logoUrl: t.logoUrl ?? '',
      faviconUrl: t.faviconUrl ?? '',
    })
    setOpen(true)
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f))

  const save = () => {
    if (!form) return
    setError(null)
    startTransition(async () => {
      const res = await overrideTenantBrandingAction({
        tenantId: form.tenantId,
        primaryColor: form.primaryColor.trim() || null,
        secondaryColor: form.secondaryColor.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        faviconUrl: form.faviconUrl.trim() || null,
      }).catch((e) => ({ error: e instanceof Error ? e.message : 'Error' }))
      if (res && 'error' in res && res.error) {
        setError(String(res.error))
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-gray-50 p-4">
        <h3 className="text-base font-semibold">Branding por tenant</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Edita el branding de cualquier tenant. Si un campo queda vacío, hereda de
          los defaults del sistema.
        </p>
      </div>
      <div className="overflow-x-auto">
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
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => {
              const personalized = t.primaryColor || t.logoUrl || t.secondaryColor || t.faviconUrl
              return (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.name}</div>
                    <div className="font-mono text-[10px] text-gray-500">{t.subdomain}</div>
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
                        <span className="font-mono text-xs">{t.primaryColor}</span>
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
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              )
            })}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                  No hay tenants activos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Branding · {form?.name}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary">Color primario</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Color primario"
                      value={/^#[0-9a-fA-F]{6}$/.test(form.primaryColor) ? form.primaryColor : '#E0492A'}
                      onChange={(e) => set('primaryColor', e.target.value)}
                      className="h-9 w-10 cursor-pointer rounded border border-gray-200"
                    />
                    <Input
                      value={form.primaryColor}
                      onChange={(e) => set('primaryColor', e.target.value)}
                      placeholder="#E0492A"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary">Color secundario</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Color secundario"
                      value={/^#[0-9a-fA-F]{6}$/.test(form.secondaryColor) ? form.secondaryColor : '#111827'}
                      onChange={(e) => set('secondaryColor', e.target.value)}
                      className="h-9 w-10 cursor-pointer rounded border border-gray-200"
                    />
                    <Input
                      value={form.secondaryColor}
                      onChange={(e) => set('secondaryColor', e.target.value)}
                      placeholder="opcional"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="logo">URL del logo</Label>
                <Input
                  id="logo"
                  value={form.logoUrl}
                  onChange={(e) => set('logoUrl', e.target.value)}
                  placeholder="https://… (vacío = default)"
                />
              </div>
              <div>
                <Label htmlFor="favicon">URL del favicon</Label>
                <Input
                  id="favicon"
                  value={form.faviconUrl}
                  onChange={(e) => set('faviconUrl', e.target.value)}
                  placeholder="https://… (vacío = default)"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={isPending}>
              {isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
