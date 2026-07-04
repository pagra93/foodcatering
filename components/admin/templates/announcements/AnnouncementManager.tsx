'use client'

/**
 * CRUD de avisos en-app. Patrón TaxRuleManager: tabla + dialog crear/editar,
 * toggle activo y borrar. Cablea las server actions de announcements.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  upsertAnnouncementAction,
  toggleAnnouncementAction,
  deleteAnnouncementAction,
} from './actions'

type Severity = 'INFO' | 'WARNING' | 'CRITICAL'
type Audience = 'ALL' | 'EMPRESA' | 'CATERING' | 'EMPLEADO'

export type AnnouncementRow = {
  id: string
  title: string
  body: string
  severity: Severity
  audience: Audience
  startsAt: string | null // YYYY-MM-DD
  endsAt: string | null
  dismissible: boolean
  active: boolean
}

const SEVERITY_META: Record<Severity, { label: string; cls: string }> = {
  INFO: { label: 'Info', cls: 'bg-primary/10 text-primary' },
  WARNING: { label: 'Aviso', cls: 'bg-amber-100 text-amber-700' },
  CRITICAL: { label: 'Crítico', cls: 'bg-red-100 text-red-700' },
}
const AUDIENCE_LABEL: Record<Audience, string> = {
  ALL: 'Todos',
  EMPRESA: 'Empresas',
  CATERING: 'Caterings',
  EMPLEADO: 'Empleados',
}

type FormState = {
  id?: string
  title: string
  body: string
  severity: Severity
  audience: Audience
  startsAt: string
  endsAt: string
  dismissible: boolean
  active: boolean
}

const EMPTY: FormState = {
  title: '',
  body: '',
  severity: 'INFO',
  audience: 'ALL',
  startsAt: '',
  endsAt: '',
  dismissible: true,
  active: true,
}

export function AnnouncementManager({ announcements }: { announcements: AnnouncementRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)

  const openNew = () => {
    setError(null)
    setForm(EMPTY)
    setOpen(true)
  }
  const openEdit = (a: AnnouncementRow) => {
    setError(null)
    setForm({
      id: a.id,
      title: a.title,
      body: a.body,
      severity: a.severity,
      audience: a.audience,
      startsAt: a.startsAt ?? '',
      endsAt: a.endsAt ?? '',
      dismissible: a.dismissible,
      active: a.active,
    })
    setOpen(true)
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const save = () => {
    setError(null)
    if (form.title.trim().length < 3 || form.body.trim().length < 3) {
      setError('Título y cuerpo son obligatorios.')
      return
    }
    startTransition(async () => {
      const res = await upsertAnnouncementAction({
        id: form.id,
        title: form.title.trim(),
        body: form.body.trim(),
        severity: form.severity,
        audience: form.audience,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        dismissible: form.dismissible,
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

  const toggle = (a: AnnouncementRow) =>
    startTransition(async () => {
      await toggleAnnouncementAction(a.id, !a.active).catch(() => {})
      router.refresh()
    })

  const remove = (a: AnnouncementRow) => {
    if (!window.confirm(`¿Eliminar el aviso "${a.title}"?`)) return
    startTransition(async () => {
      await deleteAnnouncementAction(a.id).catch(() => {})
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} disabled={isPending}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo aviso
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Aviso</th>
                <th className="px-4 py-3 text-left">Severidad</th>
                <th className="px-4 py-3 text-left">Audiencia</th>
                <th className="px-4 py-3 text-left">Ventana</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.title}</div>
                    <div className="line-clamp-1 text-xs text-gray-500">{a.body}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_META[a.severity].cls}`}>
                      {SEVERITY_META[a.severity].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{AUDIENCE_LABEL[a.audience]}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {a.startsAt ? format(new Date(a.startsAt), 'dd MMM', { locale: es }) : '—'}
                    {' → '}
                    {a.endsAt ? format(new Date(a.endsAt), 'dd MMM', { locale: es }) : '∞'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggle(a)}
                      disabled={isPending}
                      title={a.active ? 'Desactivar' : 'Activar'}
                    >
                      <Badge variant={a.active ? 'default' : 'secondary'} className="cursor-pointer">
                        {a.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(a)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {announcements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                    Sin avisos. Crea el primero.
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
            <DialogTitle>{form.id ? 'Editar aviso' : 'Nuevo aviso'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="body">Cuerpo</Label>
              <Textarea id="body" rows={3} value={form.body} onChange={(e) => set('body', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="severity">Severidad</Label>
                <Select value={form.severity} onValueChange={(v) => set('severity', v as Severity)}>
                  <SelectTrigger id="severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARNING">Aviso</SelectItem>
                    <SelectItem value="CRITICAL">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="audience">Audiencia</Label>
                <Select value={form.audience} onValueChange={(v) => set('audience', v as Audience)}>
                  <SelectTrigger id="audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los portales</SelectItem>
                    <SelectItem value="EMPRESA">Empresas</SelectItem>
                    <SelectItem value="CATERING">Caterings</SelectItem>
                    <SelectItem value="EMPLEADO">Empleados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startsAt">Desde (opcional)</Label>
                <Input id="startsAt" type="date" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="endsAt">Hasta (opcional)</Label>
                <Input id="endsAt" type="date" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.dismissible} onChange={(e) => set('dismissible', e.target.checked)} />
                Descartable por el usuario
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
                Activo
              </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
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
