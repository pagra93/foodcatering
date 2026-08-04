'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import type { Allergen, AllergenCategory } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  upsertAllergenAction,
  toggleAllergenAction,
} from './actions'

const CATEGORIES: { value: AllergenCategory; label: string }[] = [
  { value: 'CEREALS_WITH_GLUTEN', label: 'Cereales con gluten' },
  { value: 'CRUSTACEANS', label: 'Crustáceos' },
  { value: 'EGGS', label: 'Huevos' },
  { value: 'FISH', label: 'Pescado' },
  { value: 'PEANUTS', label: 'Cacahuetes' },
  { value: 'SOYBEANS', label: 'Soja' },
  { value: 'MILK', label: 'Leche' },
  { value: 'TREE_NUTS', label: 'Frutos de cáscara' },
  { value: 'CELERY', label: 'Apio' },
  { value: 'MUSTARD', label: 'Mostaza' },
  { value: 'SESAME', label: 'Sésamo' },
  { value: 'SULPHITES', label: 'Sulfitos' },
  { value: 'LUPIN', label: 'Altramuces' },
  { value: 'MOLLUSCS', label: 'Moluscos' },
  { value: 'OTHER', label: 'Otro' },
]

type Props = {
  allergens: Allergen[]
}

export function AllergensManager({ allergens }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Allergen | null>(null)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<AllergenCategory>('OTHER')
  const [description, setDescription] = useState('')

  const openNew = () => {
    setEditing(null)
    setCode('')
    setName('')
    setCategory('OTHER')
    setDescription('')
    setOpen(true)
  }

  const openEdit = (a: Allergen) => {
    setEditing(a)
    setCode(a.code)
    setName(a.name)
    setCategory(a.category)
    setDescription(a.description ?? '')
    setOpen(true)
  }

  const save = () => {
    startTransition(async () => {
      const res = await upsertAllergenAction({
        id: editing?.id,
        code: code.trim().toLowerCase(),
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        active: editing?.active ?? true,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success(editing ? 'Alérgeno actualizado' : 'Alérgeno creado')
      setOpen(false)
      router.refresh()
    })
  }

  const toggle = (a: Allergen) => {
    startTransition(async () => {
      const res = await toggleAllergenAction({ id: a.id, active: !a.active })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success(a.active ? 'Desactivado' : 'Reactivado')
      router.refresh()
    })
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-gray-50 p-4">
          <div>
            <h3 className="text-base font-semibold">
              Alérgenos ({allergens.length})
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Los 14 de la UE vienen sembrados. Puedes añadir propios para
              casos específicos.
            </p>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo alérgeno
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-center">Activo</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {allergens.map((a) => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">
                    {a.code}
                  </code>
                </td>
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px]">
                    {CATEGORIES.find((c) => c.value === a.category)?.label ??
                      a.category}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={a.active}
                    onCheckedChange={() => toggle(a)}
                    disabled={isPending}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(a)}
                    disabled={isPending}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {allergens.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay alérgenos. Ejecuta el seed.
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
              {editing ? 'Editar alérgeno' : 'Nuevo alérgeno'}
            </DialogTitle>
            <DialogDescription>
              Los códigos van en minúsculas y guiones bajos (ej:
              cereals_with_gluten).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label>Código</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="gluten"
                className="mt-1 font-mono"
                disabled={!!editing}
              />
            </div>
            <div>
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cereales con gluten"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Categoría EU</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as AllergenCategory)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button onClick={save} disabled={isPending || !code || !name}>
              {isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
