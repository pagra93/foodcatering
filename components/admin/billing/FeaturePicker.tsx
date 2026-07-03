'use client'

/**
 * Selector de features para un plan: catálogo agrupado por categoría con
 * checkboxes. Las features `core` salen siempre activas (deshabilitadas).
 * Espejo de PermissionPicker (permisos ↔ features).
 */

import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

export type CatalogFeature = {
  key: string
  label: string
  category: string
  description: string
  core?: boolean
}
export type CatalogGroup = {
  category: string
  label: string
  features: CatalogFeature[]
}

type Props = {
  catalog: CatalogGroup[]
  selected: Set<string>
  onToggle: (key: string, on: boolean) => void
  onToggleMany: (keys: string[], on: boolean) => void
}

export function FeaturePicker({ catalog, selected, onToggle, onToggleMany }: Props) {
  const countSelected = (keys: string[]) => keys.filter((k) => selected.has(k)).length

  return (
    <div className="space-y-3">
      {catalog.map((group) => {
        const optional = group.features.filter((f) => !f.core)
        const oKeys = optional.map((f) => f.key)
        const oSel = countSelected(oKeys)
        return (
          <div key={group.category} className="rounded-lg border border-gray-200">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                {group.label}
                {oKeys.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {oSel}/{oKeys.length}
                  </Badge>
                )}
              </span>
              {oKeys.length > 0 && (
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <Checkbox
                    checked={oSel === oKeys.length}
                    onCheckedChange={(c) => onToggleMany(oKeys, Boolean(c))}
                  />
                  Toda la categoría
                </label>
              )}
            </div>

            <div className="grid gap-2 px-4 py-3 sm:grid-cols-2">
              {group.features.map((f) => (
                <label
                  key={f.key}
                  className="flex items-start gap-2 text-sm"
                  title={f.description}
                >
                  <Checkbox
                    checked={f.core ? true : selected.has(f.key)}
                    disabled={f.core}
                    onCheckedChange={(c) => onToggle(f.key, Boolean(c))}
                  />
                  <span>
                    <span className="font-medium text-gray-800">
                      {f.label}
                      {f.core && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          incluida
                        </Badge>
                      )}
                    </span>
                    <span className="block text-xs text-gray-400">{f.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
