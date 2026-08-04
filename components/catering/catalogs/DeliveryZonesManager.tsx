'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react'
import type { DeliveryZone } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  upsertDeliveryZoneAction,
  toggleDeliveryZoneAction,
  deleteDeliveryZoneAction,
} from './actions'

type Props = {
  zones: DeliveryZone[]
}

export function DeliveryZonesManager({ zones }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DeliveryZone | null>(null)
  const [name, setName] = useState('')
  const [postalCodesRaw, setPostalCodesRaw] = useState('')
  const [maxKm, setMaxKm] = useState('')
  const [notes, setNotes] = useState('')

  const openNew = () => {
    setEditing(null)
    setName('')
    setPostalCodesRaw('')
    setMaxKm('')
    setNotes('')
    setOpen(true)
  }

  const openEdit = (z: DeliveryZone) => {
    setEditing(z)
    setName(z.name)
    setPostalCodesRaw(z.postalCodes.join(', '))
    setMaxKm(z.maxDistanceKm?.toString() ?? '')
    setNotes(z.notes ?? '')
    setOpen(true)
  }

  const save = () => {
    const codes = postalCodesRaw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (codes.length === 0) {
      toast.error('Añade al menos un código postal')
      return
    }
    if (codes.some((c) => !/^\d{5}$/.test(c))) {
      toast.error('Los CP deben ser 5 dígitos (ej: 28001)')
      return
    }

    startTransition(async () => {
      const res = await upsertDeliveryZoneAction({
        id: editing?.id,
        name: name.trim(),
        postalCodes: codes,
        maxDistanceKm: maxKm ? Number(maxKm) : undefined,
        notes: notes.trim() || undefined,
        active: editing?.active ?? true,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success(editing ? 'Zona actualizada' : 'Zona creada')
      setOpen(false)
      router.refresh()
    })
  }

  const toggle = (z: DeliveryZone) => {
    startTransition(async () => {
      const res = await toggleDeliveryZoneAction({ id: z.id, active: !z.active })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      router.refresh()
    })
  }

  const remove = (z: DeliveryZone) => {
    if (!confirm(`¿Borrar la zona "${z.name}"?`)) return
    startTransition(async () => {
      const res = await deleteDeliveryZoneAction({ id: z.id })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Zona borrada')
      router.refresh()
    })
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-gray-50 p-4">
          <div>
            <h3 className="text-base font-semibold">
              Zonas de reparto ({zones.length})
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Agrupa códigos postales que cubres, con distancia máxima y notas
              operativas. Se usa para buscar a qué catering enrutar un pedido.
            </p>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva zona
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Zona</th>
              <th className="px-4 py-3 text-left">Códigos postales</th>
              <th className="px-4 py-3 text-center">Km máx</th>
              <th className="px-4 py-3 text-center">Activa</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr
                key={z.id}
                className={`border-b last:border-0 hover:bg-gray-50 ${
                  !z.active ? 'opacity-50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium">{z.name}</div>
                      {z.notes && (
                        <div className="text-xs text-gray-500">{z.notes}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {z.postalCodes.slice(0, 6).map((cp) => (
                      <Badge
                        key={cp}
                        variant="outline"
                        className="font-mono text-[10px]"
                      >
                        {cp}
                      </Badge>
                    ))}
                    {z.postalCodes.length > 6 && (
                      <span className="text-xs text-gray-500">
                        +{z.postalCodes.length - 6}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  {z.maxDistanceKm ? `${z.maxDistanceKm} km` : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={z.active}
                    onCheckedChange={() => toggle(z)}
                    disabled={isPending}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(z)}
                      disabled={isPending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(z)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {zones.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  Aún no has definido zonas de reparto.
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
              {editing ? 'Editar zona' : 'Nueva zona de reparto'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label>Nombre de la zona</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Centro Madrid, Norte Barcelona…"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Códigos postales (5 dígitos, separados por coma)</Label>
              <Textarea
                value={postalCodesRaw}
                onChange={(e) => setPostalCodesRaw(e.target.value)}
                placeholder="28001, 28002, 28003"
                className="mt-1 font-mono"
                rows={3}
              />
              <p className="mt-1 text-xs text-gray-500">
                Usa coma o salto de línea como separador.
              </p>
            </div>
            <div>
              <Label>Distancia máxima en km (opcional)</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={maxKm}
                onChange={(e) => setMaxKm(e.target.value)}
                placeholder="25"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notas operativas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Entregas solo tras 10:00, acceso por la parte trasera…"
                className="mt-1"
                rows={2}
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
              disabled={isPending || !name || !postalCodesRaw}
            >
              {isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
