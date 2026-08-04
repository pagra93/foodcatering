'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Holiday, HolidayScope } from '@prisma/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  upsertOfficialHolidayAction,
  deleteOfficialHolidayAction,
} from './actions'

const SCOPE_META: Record<
  Exclude<HolidayScope, 'TENANT'>,
  { label: string; variant: 'default' | 'secondary' }
> = {
  NATIONAL: { label: 'Nacional', variant: 'default' },
  REGION: { label: 'Regional', variant: 'secondary' },
}

type Props = {
  holidays: Holiday[]
}

export function OfficialHolidaysManager({ holidays }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Holiday | null>(null)

  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [scope, setScope] = useState<'NATIONAL' | 'REGION'>('NATIONAL')
  const [regionCode, setRegionCode] = useState('')
  const [description, setDescription] = useState('')

  const years = useMemo(() => {
    const yearSet = new Set(holidays.map((h) => h.date.getUTCFullYear()))
    return Array.from(yearSet).sort((a, b) => b - a)
  }, [holidays])

  const [selectedYear, setSelectedYear] = useState<number>(
    years[0] ?? new Date().getFullYear()
  )

  const grouped = useMemo(
    () => holidays.filter((h) => h.date.getUTCFullYear() === selectedYear),
    [holidays, selectedYear]
  )

  const openNew = () => {
    setEditing(null)
    setDate(`${selectedYear}-01-01`)
    setName('')
    setScope('NATIONAL')
    setRegionCode('')
    setDescription('')
    setOpen(true)
  }

  const openEdit = (h: Holiday) => {
    setEditing(h)
    setDate(format(h.date, 'yyyy-MM-dd'))
    setName(h.name)
    setScope(h.scope === 'REGION' ? 'REGION' : 'NATIONAL')
    setRegionCode(h.regionCode ?? '')
    setDescription(h.description ?? '')
    setOpen(true)
  }

  const save = () => {
    startTransition(async () => {
      const res = await upsertOfficialHolidayAction({
        id: editing?.id,
        date: new Date(date),
        name: name.trim(),
        scope,
        regionCode:
          scope === 'REGION' ? regionCode.trim().toUpperCase() : undefined,
        description: description.trim() || undefined,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success(editing ? 'Festivo actualizado' : 'Festivo creado')
      setOpen(false)
      router.refresh()
    })
  }

  const remove = (h: Holiday) => {
    if (!confirm(`¿Borrar "${h.name}" del ${format(h.date, 'PPP', { locale: es })}?`))
      return
    startTransition(async () => {
      const res = await deleteOfficialHolidayAction({ id: h.id })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Festivo borrado')
      router.refresh()
    })
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gray-50 p-4">
          <div>
            <h3 className="text-base font-semibold">
              Festivos oficiales ({grouped.length} en {selectedYear})
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Estos festivos aplican a todos los tenants por defecto. Empresas
              y caterings pueden desactivar individualmente los que no
              apliquen (ej: servicios 24/7).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.length === 0 && (
                  <SelectItem value={String(new Date().getFullYear())}>
                    {new Date().getFullYear()}
                  </SelectItem>
                )}
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo festivo
            </Button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Ámbito</th>
              <th className="px-4 py-3 text-left">Región</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((h) => (
              <tr key={h.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {format(h.date, 'EEEE d MMM', { locale: es })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(h.date, 'yyyy-MM-dd')}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{h.name}</td>
                <td className="px-4 py-3">
                  {h.scope === 'TENANT' ? (
                    <Badge variant="outline" className="text-[10px]">
                      Tenant (no editable)
                    </Badge>
                  ) : (
                    <Badge
                      variant={SCOPE_META[h.scope].variant}
                      className="text-[10px]"
                    >
                      {SCOPE_META[h.scope].label}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {h.regionCode ? (
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">
                      {h.regionCode}
                    </code>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {h.scope !== 'TENANT' && (
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
                        onClick={() => remove(h)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {grouped.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay festivos oficiales en {selectedYear}.
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
              {editing ? 'Editar festivo oficial' : 'Nuevo festivo oficial'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
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
                <Label>Ámbito</Label>
                <Select
                  value={scope}
                  onValueChange={(v) => setScope(v as 'NATIONAL' | 'REGION')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NATIONAL">Nacional (toda España)</SelectItem>
                    <SelectItem value="REGION">Regional (CCAA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Año Nuevo"
                className="mt-1"
              />
            </div>

            {scope === 'REGION' && (
              <div>
                <Label>Código región (ISO 3166-2)</Label>
                <Input
                  value={regionCode}
                  onChange={(e) => setRegionCode(e.target.value.toUpperCase())}
                  placeholder="ES-MD, ES-CT, ES-AN…"
                  className="mt-1 font-mono"
                />
              </div>
            )}

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
            <Button
              onClick={save}
              disabled={isPending || !date || !name}
            >
              {isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
