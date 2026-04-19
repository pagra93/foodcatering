'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Save } from 'lucide-react'
import type { RetentionEntity, RetentionPolicy } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  RETENTION_DEFAULTS,
  RETENTION_ENTITY_LABEL,
} from '@/lib/db/queries/admin-retention'
import {
  seedRetentionDefaultsAction,
  upsertRetentionPolicyAction,
} from './actions'

export function RetentionPoliciesTable({
  policies,
}: {
  policies: RetentionPolicy[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState<
    Record<string, { days: number; mode: 'SOFT' | 'HARD' }>
  >({})

  const policyByEntity = new Map(policies.map((p) => [p.entity, p]))
  const allEntities = Object.keys(RETENTION_ENTITY_LABEL) as RetentionEntity[]

  const valueFor = (e: RetentionEntity) => {
    const d = draft[e]
    if (d) return d
    const p = policyByEntity.get(e)
    if (p) return { days: p.retentionDays, mode: p.deleteMode }
    return { days: RETENTION_DEFAULTS[e].days, mode: RETENTION_DEFAULTS[e].mode }
  }

  const isDraft = (e: RetentionEntity) => {
    const d = draft[e]
    if (!d) return false
    const p = policyByEntity.get(e)
    if (!p) return true
    return d.days !== p.retentionDays || d.mode !== p.deleteMode
  }

  const save = (e: RetentionEntity) => {
    const v = valueFor(e)
    startTransition(async () => {
      try {
        await upsertRetentionPolicyAction({
          entity: e,
          retentionDays: v.days,
          deleteMode: v.mode,
        })
        toast.success(`Política actualizada: ${e}`)
        setDraft((d) => {
          const next = { ...d }
          delete next[e]
          return next
        })
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const seedDefaults = () => {
    if (!confirm('¿Crear políticas por defecto para las entidades que no tengan?'))
      return
    startTransition(async () => {
      try {
        const { created } = await seedRetentionDefaultsAction()
        toast.success(`${created} políticas creadas`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  const unsetCount = allEntities.filter((e) => !policyByEntity.get(e)).length

  return (
    <div className="space-y-4">
      {unsetCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {unsetCount} {unsetCount === 1 ? 'entidad' : 'entidades'} sin política
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Aplica los defaults sugeridos basados en RGPD + obligaciones
                fiscales españolas.
              </p>
            </div>
            <Button onClick={seedDefaults} variant="outline" size="sm">
              Crear defaults
            </Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Entidad</th>
              <th className="px-4 py-3 text-right">Días</th>
              <th className="px-4 py-3 text-left">Modo</th>
              <th className="px-4 py-3 text-left">Última ejecución</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {allEntities.map((e) => {
              const p = policyByEntity.get(e)
              const v = valueFor(e)
              const dirty = isDraft(e)
              return (
                <tr key={e} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{e}</div>
                    <div className="text-xs text-gray-500">
                      {RETENTION_ENTITY_LABEL[e]}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Input
                      type="number"
                      min="1"
                      max="3650"
                      value={v.days}
                      onChange={(ev) =>
                        setDraft((d) => ({
                          ...d,
                          [e]: { ...v, days: Number(ev.target.value) },
                        }))
                      }
                      className="w-24 text-right"
                    />
                    <div className="mt-1 text-[10px] text-gray-400">
                      ≈ {Math.round(v.days / 30)} meses
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={v.mode}
                      onChange={(ev) =>
                        setDraft((d) => ({
                          ...d,
                          [e]: { ...v, mode: ev.target.value as 'SOFT' | 'HARD' },
                        }))
                      }
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                    >
                      <option value="SOFT">SOFT (marca deletedAt)</option>
                      <option value="HARD">HARD (borrado físico)</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {p?.lastRun ? (
                      <>
                        {format(p.lastRun, 'dd MMM yyyy', { locale: es })}
                        {p.lastDeleted !== null && (
                          <span className="ml-2 text-gray-500">
                            ({p.lastDeleted} filas)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">Nunca</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {dirty ? (
                      <Button
                        size="sm"
                        onClick={() => save(e)}
                        disabled={isPending}
                      >
                        <Save className="mr-1 h-3 w-3" />
                        Guardar
                      </Button>
                    ) : p ? (
                      <Badge variant="outline" className="text-[10px]">
                        Guardada
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Default
                      </Badge>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Card className="bg-gray-50/60 p-4 text-xs text-gray-600">
        <p>
          <strong>Ejecución automática pendiente:</strong> estas políticas se
          aplicarán cuando el cron de retención esté configurado (Sprint 5 -
          Operación). Por ahora se almacenan como declaración de intención.
        </p>
      </Card>
    </div>
  )
}
