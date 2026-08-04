'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import type { IncidentReason, IncidentReasonSeverity } from '@prisma/client'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  upsertIncidentReasonAction,
  toggleIncidentReasonAction,
} from './actions'

const SEVERITY_META: Record<
  IncidentReasonSeverity,
  { label: string; variant: 'default' | 'destructive' | 'secondary' }
> = {
  LOW: { label: 'Baja', variant: 'secondary' },
  MEDIUM: { label: 'Media', variant: 'default' },
  HIGH: { label: 'Alta', variant: 'destructive' },
}

type Props = {
  reasons: IncidentReason[]
}

export function IncidentReasonsManager({ reasons }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<IncidentReason | null>(null)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<IncidentReasonSeverity>('MEDIUM')
  const [requiresCompensation, setRequiresCompensation] = useState(false)

  const openNew = () => {
    setEditing(null)
    setCode('')
    setName('')
    setCategory('')
    setDescription('')
    setSeverity('MEDIUM')
    setRequiresCompensation(false)
    setOpen(true)
  }

  const openEdit = (r: IncidentReason) => {
    setEditing(r)
    setCode(r.code)
    setName(r.name)
    setCategory(r.category)
    setDescription(r.description ?? '')
    setSeverity(r.defaultSeverity)
    setRequiresCompensation(r.requiresCompensation)
    setOpen(true)
  }

  const save = () => {
    startTransition(async () => {
      const res = await upsertIncidentReasonAction({
        id: editing?.id,
        code: code.trim().toLowerCase(),
        name: name.trim(),
        category: category.trim(),
        description: description.trim() || undefined,
        defaultSeverity: severity,
        requiresCompensation,
        active: editing?.active ?? true,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success(editing ? 'Motivo actualizado' : 'Motivo creado')
      setOpen(false)
      router.refresh()
    })
  }

  const toggle = (r: IncidentReason) => {
    startTransition(async () => {
      const res = await toggleIncidentReasonAction({ id: r.id, active: !r.active })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success(r.active ? 'Desactivado' : 'Reactivado')
      router.refresh()
    })
  }

  const system = reasons.filter((r) => r.scope === 'SYSTEM')

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-gray-50 p-4">
          <div>
            <h3 className="text-base font-semibold">
              Motivos ({system.length})
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Motivos globales del sistema. Empresa y catering ven estos en
              sus dropdowns al reportar incidencias.
            </p>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo motivo
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-center">Severidad</th>
              <th className="px-4 py-3 text-center">Compensación</th>
              <th className="px-4 py-3 text-center">Activo</th>
              <th className="px-4 py-3 text-right">Editar</th>
            </tr>
          </thead>
          <tbody>
            {system.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">
                    {r.code}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{r.name}</div>
                  {r.description && (
                    <div className="mt-0.5 text-xs text-gray-500">
                      {r.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {r.category}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge
                    variant={SEVERITY_META[r.defaultSeverity].variant}
                    className="text-[10px]"
                  >
                    {SEVERITY_META[r.defaultSeverity].label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  {r.requiresCompensation ? (
                    <Badge variant="default" className="text-[10px]">
                      Sí
                    </Badge>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={r.active}
                    onCheckedChange={() => toggle(r)}
                    disabled={isPending}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(r)}
                    disabled={isPending}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {system.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay motivos. Ejecuta el seed.
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
              {editing ? 'Editar motivo' : 'Nuevo motivo'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="cold_food"
                  className="mt-1 font-mono"
                  disabled={!!editing}
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="QUALITY, DELIVERY…"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Comida fría"
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Severidad por defecto</Label>
                <Select
                  value={severity}
                  onValueChange={(v) =>
                    setSeverity(v as IncidentReasonSeverity)
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baja</SelectItem>
                    <SelectItem value="MEDIUM">Media</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div>
                  <Label>Requiere compensación</Label>
                  <div className="mt-2">
                    <Switch
                      checked={requiresCompensation}
                      onCheckedChange={setRequiresCompensation}
                    />
                  </div>
                </div>
              </div>
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
              disabled={isPending || !code || !name || !category}
            >
              {isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
