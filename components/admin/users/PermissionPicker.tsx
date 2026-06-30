'use client'

/**
 * Selector de permisos para un rol: catálogo agrupado por portal → recurso,
 * con checkboxes por acción y "seleccionar todo" por recurso/portal.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

export type CatalogPermission = {
  key: string
  resource: string
  action: string
  portal: string
  description: string | null
}
export type CatalogResource = { resource: string; permissions: CatalogPermission[] }
export type CatalogPortal = { portal: string; resources: CatalogResource[] }

const PORTAL_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  EMPRESA: 'Empresa',
  CATERING: 'Catering',
  EMPLEADO: 'Empleado',
}

type Props = {
  catalog: CatalogPortal[]
  selected: Set<string>
  disabled?: boolean
  onToggle: (key: string, on: boolean) => void
  onToggleMany: (keys: string[], on: boolean) => void
}

export function PermissionPicker({ catalog, selected, disabled, onToggle, onToggleMany }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set(catalog.map((p) => p.portal)))

  const togglePortalOpen = (portal: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(portal)) next.delete(portal)
      else next.add(portal)
      return next
    })

  const portalKeys = (p: CatalogPortal) => p.resources.flatMap((r) => r.permissions.map((x) => x.key))
  const countSelected = (keys: string[]) => keys.filter((k) => selected.has(k)).length

  return (
    <div className="space-y-3">
      {catalog.map((portal) => {
        const pKeys = portalKeys(portal)
        const pSel = countSelected(pKeys)
        const isOpen = open.has(portal.portal)
        return (
          <div key={portal.portal} className="rounded-lg border border-gray-200">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2">
              <button
                type="button"
                onClick={() => togglePortalOpen(portal.portal)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-900"
              >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {PORTAL_LABEL[portal.portal] ?? portal.portal}
                <Badge variant="secondary" className="ml-1">
                  {pSel}/{pKeys.length}
                </Badge>
              </button>
              {!disabled && (
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <Checkbox
                    checked={pSel === pKeys.length}
                    onCheckedChange={(c) => onToggleMany(pKeys, Boolean(c))}
                  />
                  Todo el portal
                </label>
              )}
            </div>

            {isOpen && (
              <div className="divide-y">
                {portal.resources.map((res) => {
                  const rKeys = res.permissions.map((p) => p.key)
                  const rSel = countSelected(rKeys)
                  return (
                    <div key={res.resource} className="px-4 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono text-xs font-medium text-gray-700">
                          {res.resource}
                        </span>
                        {!disabled && (
                          <label className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Checkbox
                              checked={rSel === rKeys.length}
                              onCheckedChange={(c) => onToggleMany(rKeys, Boolean(c))}
                            />
                            todo
                          </label>
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {res.permissions.map((p) => (
                          <label
                            key={p.key}
                            className="flex items-start gap-2 text-sm"
                            title={p.description ?? p.key}
                          >
                            <Checkbox
                              checked={selected.has(p.key)}
                              disabled={disabled}
                              onCheckedChange={(c) => onToggle(p.key, Boolean(c))}
                            />
                            <span>
                              <span className="font-medium text-gray-800">{p.action}</span>
                              {p.description && (
                                <span className="block text-xs text-gray-400">{p.description}</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
