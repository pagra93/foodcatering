'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import type { MenuTemplate } from '@prisma/client'
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
  upsertMenuTemplateAction,
  toggleMenuTemplateAction,
  deleteMenuTemplateAction,
} from './actions'

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
type Course = 'first' | 'second' | 'dessert'

type DayMenu = {
  first: string[]
  second: string[]
  dessert: string[]
}

type Structure = Record<DayKey, DayMenu>

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
]

const COURSES: { key: Course; label: string }[] = [
  { key: 'first', label: 'Primeros' },
  { key: 'second', label: 'Segundos' },
  { key: 'dessert', label: 'Postres' },
]

function emptyStructure(): Structure {
  return {
    monday: { first: [], second: [], dessert: [] },
    tuesday: { first: [], second: [], dessert: [] },
    wednesday: { first: [], second: [], dessert: [] },
    thursday: { first: [], second: [], dessert: [] },
    friday: { first: [], second: [], dessert: [] },
  }
}

type Props = {
  templates: MenuTemplate[]
}

export function MenuTemplatesManager({ templates }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MenuTemplate | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [structure, setStructure] = useState<Structure>(emptyStructure())

  const openNew = () => {
    setEditing(null)
    setName('')
    setDescription('')
    setStructure(emptyStructure())
    setOpen(true)
  }

  const openEdit = (t: MenuTemplate) => {
    setEditing(t)
    setName(t.name)
    setDescription(t.description ?? '')
    const s = t.structure as unknown as Partial<Structure> | null
    setStructure({
      monday: s?.monday ?? { first: [], second: [], dessert: [] },
      tuesday: s?.tuesday ?? { first: [], second: [], dessert: [] },
      wednesday: s?.wednesday ?? { first: [], second: [], dessert: [] },
      thursday: s?.thursday ?? { first: [], second: [], dessert: [] },
      friday: s?.friday ?? { first: [], second: [], dessert: [] },
    })
    setOpen(true)
  }

  const addDish = (day: DayKey, course: Course, value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setStructure((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [course]: [...prev[day][course], trimmed],
      },
    }))
  }

  const removeDish = (day: DayKey, course: Course, idx: number) => {
    setStructure((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [course]: prev[day][course].filter((_, i) => i !== idx),
      },
    }))
  }

  const save = () => {
    startTransition(async () => {
      try {
        await upsertMenuTemplateAction({
          id: editing?.id,
          name: name.trim(),
          description: description.trim() || undefined,
          structure,
          active: editing?.active ?? true,
        })
        toast.success(editing ? 'Plantilla actualizada' : 'Plantilla creada')
        setOpen(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const toggle = (t: MenuTemplate) => {
    startTransition(async () => {
      try {
        await toggleMenuTemplateAction({ id: t.id, active: !t.active })
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const remove = (t: MenuTemplate) => {
    if (!confirm(`¿Borrar la plantilla "${t.name}"?`)) return
    startTransition(async () => {
      try {
        await deleteMenuTemplateAction({ id: t.id })
        toast.success('Plantilla borrada')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-gray-50 p-4">
          <div>
            <h3 className="text-base font-semibold">
              Plantillas de menú ({templates.length})
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Plantillas semanales reutilizables. Las usas como punto de
              partida al programar menús para un cliente.
            </p>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva plantilla
          </Button>
        </div>

        <div className="divide-y">
          {templates.map((t) => {
            const s = t.structure as unknown as Partial<Structure> | null
            const totalDishes = DAYS.reduce((acc, d) => {
              const day = s?.[d.key]
              if (!day) return acc
              return (
                acc +
                (day.first?.length ?? 0) +
                (day.second?.length ?? 0) +
                (day.dessert?.length ?? 0)
              )
            }, 0)
            return (
              <div
                key={t.id}
                className={`flex items-center justify-between p-4 ${
                  !t.active ? 'opacity-50' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{t.name}</h4>
                    <Badge variant="outline" className="text-[10px]">
                      {totalDishes} platos · 5 días
                    </Badge>
                  </div>
                  {t.description && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {t.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={t.active}
                    onCheckedChange={() => toggle(t)}
                    disabled={isPending}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(t)}
                    disabled={isPending}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(t)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            )
          })}
          {templates.length === 0 && (
            <div className="p-12 text-center text-sm text-gray-500">
              Aún no tienes plantillas de menú.
            </div>
          )}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar plantilla' : 'Nueva plantilla de menú'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label>Nombre de la plantilla</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Menú mediterráneo, Primavera 2026…"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="mt-2">
              <Label className="text-base font-semibold">Semana tipo</Label>
              <p className="mt-1 text-xs text-gray-500">
                Añade platos sugeridos para cada día y tiempo. Son nombres
                libres (no es necesario que existan en tu catálogo todavía).
              </p>
            </div>

            <div className="space-y-3">
              {DAYS.map(({ key: day, label }) => (
                <Card key={day} className="p-3">
                  <h4 className="mb-2 text-sm font-semibold">{label}</h4>
                  <div className="grid gap-2 md:grid-cols-3">
                    {COURSES.map(({ key: course, label: courseLabel }) => (
                      <CourseEditor
                        key={course}
                        label={courseLabel}
                        items={structure[day][course]}
                        onAdd={(v) => addDish(day, course, v)}
                        onRemove={(i) => removeDish(day, course, i)}
                      />
                    ))}
                  </div>
                </Card>
              ))}
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
            <Button onClick={save} disabled={isPending || !name}>
              {isPending ? 'Guardando…' : 'Guardar plantilla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function CourseEditor({
  label,
  items,
  onAdd,
  onRemove,
}: {
  label: string
  items: string[]
  onAdd: (v: string) => void
  onRemove: (i: number) => void
}) {
  const [value, setValue] = useState('')
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase text-gray-500">
        {label}
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div
            key={`${item}-${i}`}
            className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs"
          >
            <span className="truncate">{item}</span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="ml-2 text-gray-500 hover:text-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (value.trim()) {
                onAdd(value)
                setValue('')
              }
            }
          }}
          placeholder="Añadir…"
          className="h-7 text-xs"
        />
      </div>
    </div>
  )
}
