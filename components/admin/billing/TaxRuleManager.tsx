'use client'

/**
 * Gestión de reglas fiscales (TaxRule): tabla + dialog de crear/editar cableado
 * a upsertTaxRuleAction (gate tax:edit). Sustituye el stub "próxima iteración".
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { upsertTaxRuleAction } from './actions'

export type TaxRuleRow = {
  id: string
  code: string
  name: string
  rate: number
  category: string
  region: string | null
  validFrom: string // YYYY-MM-DD
  validTo: string | null
  active: boolean
}

type FormState = {
  id?: string
  code: string
  name: string
  rate: string
  category: string
  region: string
  validFrom: string
  validTo: string
  active: boolean
}

const EMPTY: FormState = {
  code: '',
  name: '',
  rate: '',
  category: 'food',
  region: '',
  validFrom: '',
  validTo: '',
  active: true,
}

export function TaxRuleManager({ rules }: { rules: TaxRuleRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)

  const openNew = () => {
    setError(null)
    setForm({ ...EMPTY, validFrom: new Date().toISOString().slice(0, 10) })
    setOpen(true)
  }

  const openEdit = (r: TaxRuleRow) => {
    setError(null)
    setForm({
      id: r.id,
      code: r.code,
      name: r.name,
      rate: String(r.rate),
      category: r.category,
      region: r.region ?? '',
      validFrom: r.validFrom,
      validTo: r.validTo ?? '',
      active: r.active,
    })
    setOpen(true)
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const save = () => {
    setError(null)
    if (!form.code || !form.name || !form.validFrom) {
      setError('Código, nombre y "vigente desde" son obligatorios.')
      return
    }
    startTransition(async () => {
      const res = await upsertTaxRuleAction({
        id: form.id,
        code: form.code.trim(),
        name: form.name.trim(),
        rate: Number(form.rate || 0),
        category: form.category.trim(),
        region: form.region.trim() || undefined,
        validFrom: form.validFrom,
        validTo: form.validTo || undefined,
        active: form.active,
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} disabled={isPending}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva regla
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-right">Tasa</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-left">Región</th>
                <th className="px-4 py-3 text-left">Vigente desde</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {r.rate.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">
                      {r.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {r.region ?? 'Nacional'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {format(new Date(r.validFrom), 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={r.active ? 'default' : 'secondary'}>
                      {r.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                    Sin reglas fiscales. Crea la primera.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar regla fiscal' : 'Nueva regla fiscal'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Código</Label>
              <Input id="code" value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="IVA_COMIDA" />
            </div>
            <div>
              <Label htmlFor="rate">Tasa (%)</Label>
              <Input id="rate" type="number" min={0} max={100} step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} placeholder="10" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="IVA comida (reducido)" />
            </div>
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Input id="category" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="food / service / digital" />
            </div>
            <div>
              <Label htmlFor="region">Región</Label>
              <Input id="region" value={form.region} onChange={(e) => set('region', e.target.value)} placeholder="ES-CN (opcional)" />
            </div>
            <div>
              <Label htmlFor="validFrom">Vigente desde</Label>
              <Input id="validFrom" type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="validTo">Vigente hasta</Label>
              <Input id="validTo" type="date" value={form.validTo} onChange={(e) => set('validTo', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
                Regla activa
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

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
    </div>
  )
}
