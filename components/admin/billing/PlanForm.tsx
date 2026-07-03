'use client'

/**
 * Formulario de creación/edición de un plan SaaS + sus features y límites.
 * Planes de sistema: no se borran; se editan precio, límites y features.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FeaturePicker, type CatalogGroup } from './FeaturePicker'
import { createPlan, updatePlan, deletePlan } from './plan-actions'

type Initial = {
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number | null
  maxEmployees: number | null
  maxSites: number | null
  maxCaterings: number | null
  supportLevel: string
  active: boolean
  scope: 'SYSTEM' | 'CUSTOM'
  featureKeys: string[]
  companiesCount?: number
}

type Props = {
  mode: 'create' | 'edit'
  planId?: string
  catalog: CatalogGroup[]
  initial: Initial
}

/** Input numérico opcional: vacío = null (ilimitado). */
function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        value={value ?? ''}
        placeholder="∞ (sin límite)"
        onChange={(e) =>
          onChange(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))
        }
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export function PlanForm({ mode, planId, catalog, initial }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [monthlyPrice, setMonthlyPrice] = useState<number>(initial.monthlyPrice)
  const [yearlyPrice, setYearlyPrice] = useState<number | null>(initial.yearlyPrice)
  const [maxEmployees, setMaxEmployees] = useState<number | null>(initial.maxEmployees)
  const [maxSites, setMaxSites] = useState<number | null>(initial.maxSites)
  const [maxCaterings, setMaxCaterings] = useState<number | null>(initial.maxCaterings)
  const [supportLevel, setSupportLevel] = useState(initial.supportLevel)
  const [active, setActive] = useState(initial.active)
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.featureKeys))

  const isSystem = initial.scope === 'SYSTEM'

  const toggle = (key: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })

  const toggleMany = (keys: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const k of keys) {
        if (on) next.add(k)
        else next.delete(k)
      }
      return next
    })

  const save = () => {
    setError(null)
    const payload = {
      name,
      description,
      monthlyPrice,
      yearlyPrice,
      maxEmployees,
      maxSites,
      maxCaterings,
      supportLevel,
      active,
      featureKeys: [...selected],
    }
    startTransition(async () => {
      const res =
        mode === 'create' ? await createPlan(payload) : await updatePlan(planId!, payload)
      if (res.error) {
        setError(res.error)
        return
      }
      router.push('/admin/billing/plans')
      router.refresh()
    })
  }

  const remove = () => {
    if (!planId) return
    if (!confirm('¿Eliminar este plan? Solo es posible si no tiene empresas asignadas.')) return
    setError(null)
    startTransition(async () => {
      const res = await deletePlan(planId)
      if (res.error) {
        setError(res.error)
        return
      }
      router.push('/admin/billing/plans')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-6">
        <div className="flex items-center gap-2">
          <Badge variant={isSystem ? 'secondary' : 'outline'}>
            {isSystem ? 'Plan de sistema' : 'Plan a medida'}
          </Badge>
          {typeof initial.companiesCount === 'number' && (
            <span className="text-xs text-gray-500">
              {initial.companiesCount} empresa(s) con este plan
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name">Nombre del plan</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="support">Nivel de soporte</Label>
            <Select value={supportLevel} onValueChange={setSupportLevel}>
              <SelectTrigger id="support">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BASIC">Básico</SelectItem>
                <SelectItem value="PRIORITY">Prioritario</SelectItem>
                <SelectItem value="DEDICATED">Dedicado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Para quién es este plan"
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h3 className="text-sm font-semibold text-gray-900">Precio y límites</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <NumberField
            id="monthlyPrice"
            label="Precio mensual (€)"
            value={monthlyPrice}
            onChange={(v) => setMonthlyPrice(v ?? 0)}
          />
          <NumberField
            id="yearlyPrice"
            label="Precio anual (€)"
            hint="Opcional"
            value={yearlyPrice}
            onChange={setYearlyPrice}
          />
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Plan activo
            </label>
          </div>
          <NumberField
            id="maxEmployees"
            label="Máx. empleados"
            hint="Vacío = ilimitado"
            value={maxEmployees}
            onChange={setMaxEmployees}
          />
          <NumberField
            id="maxSites"
            label="Máx. sedes"
            hint="Vacío = ilimitado"
            value={maxSites}
            onChange={setMaxSites}
          />
          <NumberField
            id="maxCaterings"
            label="Máx. caterings"
            hint="Vacío = ilimitado"
            value={maxCaterings}
            onChange={setMaxCaterings}
          />
        </div>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Funcionalidades incluidas</h3>
          <span className="text-xs text-gray-500">{selected.size} de pago seleccionadas</span>
        </div>
        <FeaturePicker
          catalog={catalog}
          selected={selected}
          onToggle={toggle}
          onToggleMany={toggleMany}
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div>
          {mode === 'edit' && !isSystem && (
            <Button variant="outline" className="text-red-600" onClick={remove} disabled={isPending}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar plan
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/billing/plans')}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? 'Guardando…' : mode === 'create' ? 'Crear plan' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  )
}
