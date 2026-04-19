'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createRouteAction } from './actions'

export type DriverOption = {
  id: string
  label: string // "Nombre (email)"
}

export type SiteOption = {
  id: string
  siteName: string
  companyName: string
  address: string | null
}

type Props = {
  drivers: DriverOption[]
  sites: SiteOption[]
}

export function NewRouteDialog({ drivers, sites }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const [name, setName] = useState('')
  const [date, setDate] = useState(today)
  const [driverId, setDriverId] = useState<string>('none')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([])

  const selectedSites = sites.filter((s) => selectedSiteIds.includes(s.id))
  const availableSites = sites.filter((s) => !selectedSiteIds.includes(s.id))

  const reset = () => {
    setName('')
    setDate(today)
    setDriverId('none')
    setDuration('')
    setNotes('')
    setSelectedSiteIds([])
  }

  const addSite = (id: string) => {
    if (id && !selectedSiteIds.includes(id)) {
      setSelectedSiteIds((prev) => [...prev, id])
    }
  }

  const removeSite = (id: string) => {
    setSelectedSiteIds((prev) => prev.filter((x) => x !== id))
  }

  const moveSite = (id: string, dir: -1 | 1) => {
    setSelectedSiteIds((prev) => {
      const idx = prev.indexOf(id)
      if (idx < 0) return prev
      const swap = idx + dir
      if (swap < 0 || swap >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[swap]] = [next[swap]!, next[idx]!]
      return next
    })
  }

  const save = () => {
    if (!name.trim()) {
      toast.error('Pon un nombre a la ruta')
      return
    }
    if (selectedSiteIds.length === 0) {
      toast.error('Selecciona al menos una sede')
      return
    }

    startTransition(async () => {
      const res = await createRouteAction({
        name: name.trim(),
        date: new Date(date),
        deliveryUserId: driverId === 'none' ? null : driverId,
        companySiteIds: selectedSiteIds,
        estimatedDuration: duration ? Number(duration) : null,
        notes: notes.trim() || null,
      })

      if (res.success) {
        toast.success('Ruta creada')
        setOpen(false)
        reset()
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Ruta
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva ruta de reparto</DialogTitle>
          <DialogDescription>
            Agrupa sedes que un repartidor visitará en orden. Los pedidos
            CONFIRMED de esas sedes para la fecha se asignarán a la ruta
            automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nombre de la ruta</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Zona Norte Madrid"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Fecha de reparto</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Repartidor (opcional)</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {drivers.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No tienes repartidores activos. Crea uno desde
                  Configuración → Usuarios.
                </p>
              )}
            </div>
            <div>
              <Label>Duración estimada (min)</Label>
              <Input
                type="number"
                min={15}
                max={480}
                step={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="120"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Sedes a visitar (en orden)</Label>
            <div className="mt-1 space-y-1 rounded border bg-gray-50 p-2 min-h-[60px]">
              {selectedSites.length === 0 ? (
                <p className="py-2 text-center text-xs text-gray-500">
                  Aún no hay sedes seleccionadas.
                </p>
              ) : (
                selectedSites.map((s, idx) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded border bg-white px-2 py-1.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        #{idx + 1}
                      </Badge>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {s.siteName}
                        </div>
                        <div className="truncate text-xs text-gray-500">
                          {s.companyName}
                          {s.address ? ` · ${s.address}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveSite(s.id, -1)}
                        disabled={idx === 0 || isPending}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveSite(s.id, 1)}
                        disabled={idx === selectedSites.length - 1 || isPending}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeSite(s.id)}
                        disabled={isPending}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-2">
              <Select value="" onValueChange={addSite}>
                <SelectTrigger>
                  <SelectValue placeholder="+ Añadir sede…" />
                </SelectTrigger>
                <SelectContent>
                  {availableSites.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No quedan sedes disponibles
                    </SelectItem>
                  ) : (
                    availableSites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.siteName} — {s.companyName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Recogida a las 10:00 en cocina central, llevar cambio…"
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
          <Button onClick={save} disabled={isPending}>
            {isPending ? 'Creando…' : 'Crear ruta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
