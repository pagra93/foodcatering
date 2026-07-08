'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { INCIDENT_TYPES, SEVERITY_MAP, INCIDENT_STATUS_MAP } from '@/lib/incidents/catering-ui'

export function CateringIncidentsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get('status') || 'all'
  const currentType = searchParams.get('type') || 'all'
  const currentSeverity = searchParams.get('severity') || 'all'

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filtro por Estado */}
        <div>
          <label className="text-sm font-medium mb-2 block">Estado</label>
          <Select value={currentStatus} onValueChange={(v) => updateFilter('status', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(INCIDENT_STATUS_MAP).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Tipo */}
        <div>
          <label className="text-sm font-medium mb-2 block">Tipo de Problema</label>
          <Select value={currentType} onValueChange={(v) => updateFilter('type', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.entries(INCIDENT_TYPES).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.icon} {value.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Severidad */}
        <div>
          <label className="text-sm font-medium mb-2 block">Severidad</label>
          <Select value={currentSeverity} onValueChange={(v) => updateFilter('severity', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las severidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las severidades</SelectItem>
              {Object.entries(SEVERITY_MAP).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  )
}

