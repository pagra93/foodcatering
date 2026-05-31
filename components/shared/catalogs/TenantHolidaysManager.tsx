'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Info } from 'lucide-react'
import type { Holiday, HolidayOverride } from '@prisma/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  toggleHolidayOverrideAction,
  upsertTenantHolidayAction,
  deleteTenantHolidayAction,
} from './tenant-holidays-actions'

type Props = {
  officials: Holiday[] // scope NATIONAL/REGION
  tenantHolidays: Holiday[] // scope TENANT propios del tenant
  overrides: HolidayOverride[]
}

export function TenantHolidaysManager({
  officials,
  tenantHolidays,
  overrides,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const years = useMemo(() => {
    const all = [
      ...officials.map((h) => h.date.getUTCFullYear()),
      ...tenantHolidays.map((h) => h.date.getUTCFullYear()),
    ]
    const unique = Array.from(new Set(all))
    if (unique.length === 0) unique.push(new Date().getFullYear())
    return unique.sort((a, b) => b - a)
  }, [officials, tenantHolidays])

  const [selectedYear, setSelectedYear] = useState<number>(
    years[0] ?? new Date().getFullYear()
  )

  const overrideMap = useMemo(() => {
    const m = new Map<string, HolidayOverride>()
    for (const o of overrides) m.set(o.holidayId, o)
    return m
  }, [overrides])

  const officialsInYear = useMemo(
    () => officials.filter((h) => h.date.getUTCFullYear() === selectedYear),
    [officials, selectedYear]
  )
  const tenantInYear = useMemo(
    () =>
      tenantHolidays.filter((h) => h.date.getUTCFullYear() === selectedYear),
    [tenantHolidays, selectedYear]
  )

  // Dialog propio
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Holiday | null>(null)
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const openNew = () => {
    setEditing(null)
    setDate(`${selectedYear}-01-01`)
    setName('')
    setDescription('')
    setOpen(true)
  }

  const openEdit = (h: Holiday) => {
    setEditing(h)
    setDate(format(h.date, 'yyyy-MM-dd'))
    setName(h.name)
    setDescription(h.description ?? '')
    setOpen(true)
  }

  const saveOwn = () => {
    startTransition(async () => {
      try {
        await upsertTenantHolidayAction({
          id: editing?.id,
          date: new Date(date),
          name: name.trim(),
          description: description.trim() || undefined,
        })
        toast.success(editing ? 'Festivo actualizado' : 'Festivo añadido')
        setOpen(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const removeOwn = (h: Holiday) => {
    if (!confirm(`¿Borrar "${h.name}"?`)) return
    startTransition(async () => {
      try {
        await deleteTenantHolidayAction({ id: h.id })
        toast.success('Festivo borrado')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const toggleOverride = (h: Holiday, currentlyDisabled: boolean) => {
    startTransition(async () => {
      try {
        await toggleHolidayOverrideAction({
          holidayId: h.id,
          disabled: !currentlyDisabled,
        })
        toast.success(
          !currentlyDisabled
            ? 'Festivo desactivado para tu organización'
            : 'Festivo reactivado'
        )
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Por defecto se aplican todos los festivos oficiales. Si tu operativa
          es 24/7 o tienes acuerdos específicos, puedes desactivar los que no
          apliquen, y añadir los tuyos propios (convenio, aniversario, cierre
          técnico…).
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-end">
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(Number(v))}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50 p-4">
          <h3 className="text-base font-semibold">
            Festivos oficiales ({officialsInYear.length})
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Los defines el administrador de Plati. Puedes desactivar los
            que no apliquen a tu operativa (se mantienen en otros tenants).
          </p>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Ámbito</th>
              <th className="px-4 py-3 text-center">¿Aplica a ti?</th>
            </tr>
          </thead>
          <tbody>
            {officialsInYear.map((h) => {
              const ov = overrideMap.get(h.id)
              const disabled = ov?.disabled ?? false
              return (
                <tr
                  key={h.id}
                  className={`border-b last:border-0 hover:bg-gray-50 ${
                    disabled ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {format(h.date, 'EEEE d MMM', { locale: es })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{h.name}</div>
                    {disabled && (
                      <div className="text-[11px] text-red-600">
                        Desactivado — no cuenta como festivo para ti
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={h.scope === 'NATIONAL' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {h.scope === 'NATIONAL' ? 'Nacional' : 'Regional'}
                      {h.regionCode && ` · ${h.regionCode}`}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={!disabled}
                      onCheckedChange={() => toggleOverride(h, disabled)}
                      disabled={isPending}
                    />
                  </td>
                </tr>
              )
            })}
            {officialsInYear.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay festivos oficiales en {selectedYear}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-gray-50 p-4">
          <div>
            <h3 className="text-base font-semibold">
              Tus festivos ({tenantInYear.length})
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Festivos específicos de tu organización (puente local,
              aniversario, cierre técnico…).
            </p>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Añadir festivo propio
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tenantInYear.map((h) => (
              <tr key={h.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {format(h.date, 'EEEE d MMM', { locale: es })}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{h.name}</td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {h.description ?? '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(h)}
                      disabled={isPending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeOwn(h)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {tenantInYear.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No has añadido festivos propios en {selectedYear}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar festivo propio' : 'Añadir festivo propio'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Puente de San Juan, Aniversario empresa…"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={saveOwn} disabled={isPending || !date || !name}>
              {isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
