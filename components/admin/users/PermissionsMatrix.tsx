'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import type { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PERMISSION_DESCRIPTIONS,
  rolesByTenantType,
  getPermissionState,
  type PermissionState,
} from '@/lib/auth/permissions'

type Section = 'ROOT' | 'EMPRESA' | 'CATERING'

const SECTION_META: Record<
  Section,
  { title: string; subtitle: string; accent: string }
> = {
  ROOT: {
    title: 'Equipo SinTupper',
    subtitle: 'Roles del portal administrativo.',
    accent: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  EMPRESA: {
    title: 'Empresas',
    subtitle: 'Roles del portal empresa.',
    accent: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  CATERING: {
    title: 'Caterings',
    subtitle: 'Roles del portal catering.',
    accent: 'text-amber-700 bg-amber-50 border-amber-200',
  },
}

function renderCell(state: PermissionState) {
  switch (state) {
    case 'direct':
      return (
        <span
          className="text-base text-emerald-600"
          title="Permiso directo"
        >
          ✓
        </span>
      )
    case 'wildcard':
      return (
        <span
          className="text-sm text-blue-500"
          title="Heredado por wildcard (p.ej. orders:*)"
        >
          ○
        </span>
      )
    case 'none':
      return <span className="text-gray-300">—</span>
  }
}

type Props = {
  /** Catálogo completo de permisos, agrupado por entidad. */
  permissionsByEntity: Record<string, string[]>
  /** Lista plana de todas las entidades (para filtros). */
  entities: string[]
}

export function PermissionsMatrix({ permissionsByEntity, entities }: Props) {
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<Record<Section, boolean>>({
    ROOT: true,
    EMPRESA: true,
    CATERING: true,
  })

  const filteredEntities = useMemo(() => {
    if (entityFilter === 'all') return entities
    return entities.filter((e) => e === entityFilter)
  }, [entities, entityFilter])

  const exportCsv = () => {
    const header = ['Rol', 'Categoría', ...entities.flatMap((e) => permissionsByEntity[e] ?? [])]
    const lines = [header.join(',')]

    const stateSymbol: Record<PermissionState, string> = {
      direct: 'yes',
      wildcard: 'wildcard',
      none: 'no',
    }

    for (const section of ['ROOT', 'EMPRESA', 'CATERING'] as const) {
      const roles = rolesByTenantType(section)
      for (const role of roles) {
        const row: string[] = [role, section]
        for (const entity of entities) {
          for (const perm of permissionsByEntity[entity] ?? []) {
            row.push(stateSymbol[getPermissionState(role, perm)])
          }
        }
        lines.push(row.join(','))
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sintupper-permissions-matrix-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filtros + export */}
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Filtrar por entidad
          </label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="all">Todas ({entities.length})</option>
            {entities.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </Card>

      {/* Leyenda */}
      <div className="flex gap-4 rounded-md bg-gray-50 p-3 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="text-base text-emerald-600">✓</span> directo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-sm text-blue-500">○</span> wildcard (e.g. orders:*)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-gray-300">—</span> denegado
        </span>
      </div>

      {/* Secciones colapsables */}
      {(['ROOT', 'EMPRESA', 'CATERING'] as const).map((section) => {
        const roles = rolesByTenantType(section)
        const meta = SECTION_META[section]
        const isOpen = expanded[section]

        return (
          <Card key={section} className="overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setExpanded((prev) => ({ ...prev, [section]: !prev[section] }))
              }
              className={`flex w-full items-center justify-between border-b p-4 text-left ${meta.accent}`}
            >
              <div>
                <h3 className="text-base font-semibold">{meta.title}</h3>
                <p className="text-xs opacity-80">{meta.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{roles.length} roles</Badge>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700">
                        Rol
                      </th>
                      {filteredEntities.map((entity) => (
                        <th
                          key={entity}
                          colSpan={(permissionsByEntity[entity] ?? []).length}
                          className="border-l px-3 py-2 text-center font-semibold uppercase tracking-wide text-gray-600"
                        >
                          {entity}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b bg-gray-50/60">
                      <th className="sticky left-0 bg-gray-50 px-3 py-1" />
                      {filteredEntities.flatMap((entity) =>
                        (permissionsByEntity[entity] ?? []).map((p) => (
                          <th
                            key={p}
                            className="border-l px-2 py-1 text-center font-mono text-[10px] font-normal text-gray-500"
                            title={PERMISSION_DESCRIPTIONS[p] ?? p}
                          >
                            {p.split(':').slice(1).join(':') || '*'}
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role} className="border-b hover:bg-gray-50/60">
                        <td className="sticky left-0 bg-white px-3 py-2 font-mono text-xs font-medium">
                          {role}
                        </td>
                        {filteredEntities.flatMap((entity) =>
                          (permissionsByEntity[entity] ?? []).map((p) => (
                            <td
                              key={`${role}-${p}`}
                              className="border-l px-2 py-1 text-center"
                              title={`${role} · ${p}\n${PERMISSION_DESCRIPTIONS[p] ?? ''}`}
                            >
                              {renderCell(getPermissionState(role as UserRole, p))}
                            </td>
                          ))
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
