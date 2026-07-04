'use client'

/**
 * Pestaña "Caterings" de la ficha de empresa (admin): lista los caterings
 * asignados (activos e históricos) y permite asignar uno nuevo o desactivar los
 * activos. El límite `maxCompanies` del plan del catering se enforca en el
 * server action; aquí se muestra y se deshabilitan los que están al límite.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Building2, Lock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  CompanyCateringAssignmentRow,
  AssignableCatering,
} from '@/lib/db/queries/catering-assignments'
import {
  assignCateringAction,
  deactivateCateringAssignmentAction,
} from './catering-assignment-actions'

type Props = {
  companyId: string
  assignments: CompanyCateringAssignmentRow[]
  assignable: AssignableCatering[]
  canManage: boolean
}

function limitLabel(used: number, max: number | null) {
  return max == null ? `${used} · ∞` : `${used} / ${max}`
}

export function CompanyCateringsTab({ companyId, assignments, assignable, canManage }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [tenantCatering, setTenantCatering] = useState('')
  const [type, setType] = useState<'PRIMARY' | 'BACKUP'>('PRIMARY')
  const [priority, setPriority] = useState(1)

  const active = assignments.filter((a) => a.active)
  const inactive = assignments.filter((a) => !a.active)

  const assign = () => {
    setError(null)
    if (!tenantCatering) {
      setError('Selecciona un catering.')
      return
    }
    startTransition(async () => {
      const res = await assignCateringAction({ companyId, tenantCatering, type, priority })
      if (res.error) {
        setError(res.error)
        return
      }
      setOpen(false)
      setTenantCatering('')
      setType('PRIMARY')
      setPriority(1)
      router.refresh()
    })
  }

  const deactivate = (assignmentId: string, name: string) => {
    const reason = window.prompt(`Motivo para dejar de servir con "${name}" (opcional):`) ?? undefined
    startTransition(async () => {
      const res = await deactivateCateringAssignmentAction({ assignmentId, reason })
      if (res.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Caterings asignados</h3>
          <p className="text-sm text-gray-500">
            Proveedores que sirven a esta empresa. El plan de cada catering define a
            cuántas empresas puede servir.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setOpen(true)} disabled={isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Asignar catering
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Activos */}
      {active.length === 0 ? (
        <Card className="p-8 text-center text-sm text-gray-500">
          <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          Esta empresa no tiene ningún catering asignado.
        </Card>
      ) : (
        <div className="grid gap-3">
          {active.map((a) => (
            <Card key={a.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Building2 className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{a.cateringName}</p>
                    <Badge variant={a.type === 'PRIMARY' ? 'default' : 'secondary'}>
                      {a.type === 'PRIMARY' ? 'Principal' : 'Backup'}
                    </Badge>
                    {a.cateringStatus && a.cateringStatus !== 'ACTIVE' && (
                      <Badge variant="destructive">Catering suspendido</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Prioridad {a.priority} · Plan {a.planName ?? '—'} · Cobro {a.pricing}
                  </p>
                </div>
              </div>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600"
                  onClick={() => deactivate(a.id, a.cateringName)}
                  disabled={isPending}
                >
                  Quitar
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Históricos */}
      {inactive.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Histórico</p>
          <div className="grid gap-2">
            {inactive.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-md border border-gray-100 px-4 py-2 text-sm text-gray-500"
              >
                <span>
                  {a.cateringName}
                  {a.deactivationReason ? ` — ${a.deactivationReason}` : ''}
                </span>
                <Badge variant="secondary">Inactivo</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog de asignación */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar catering</DialogTitle>
            <DialogDescription>
              Elige un catering para que sirva a esta empresa. Los que están al límite
              de su plan aparecen deshabilitados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="assign-catering">Catering</Label>
              <Select value={tenantCatering} onValueChange={setTenantCatering}>
                <SelectTrigger id="assign-catering">
                  <SelectValue placeholder="Selecciona un catering" />
                </SelectTrigger>
                <SelectContent>
                  {assignable.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-gray-400">
                      No hay caterings disponibles para asignar.
                    </div>
                  )}
                  {assignable.map((c) => (
                    <SelectItem key={c.id} value={c.id} disabled={c.atLimit}>
                      <span className="flex items-center gap-2">
                        {c.atLimit && <Lock className="h-3 w-3 text-gray-400" />}
                        {c.name} · {c.pricing} · empresas {limitLabel(c.companiesUsed, c.maxCompanies)}
                        {c.atLimit ? ' (al límite)' : ''}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assign-type">Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as 'PRIMARY' | 'BACKUP')}>
                  <SelectTrigger id="assign-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIMARY">Principal</SelectItem>
                    <SelectItem value="BACKUP">Backup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="assign-priority">Prioridad</Label>
                <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
                  <SelectTrigger id="assign-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={assign} disabled={isPending || !tenantCatering}>
              {isPending ? 'Asignando…' : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
