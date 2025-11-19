/**
 * Filtros para Historial de Pedidos
 * Mes, estado, búsqueda
 */

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type HistorialFiltersProps = {
  availableMonths: Date[]
  currentFilters: {
    month?: Date
    status?: string
    search?: string
    page: number
  }
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos los estados' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'LOCKED_AFTER_CUTOFF', label: 'Bloqueado' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'CANCELLED_BEFORE_CUTOFF', label: 'Cancelado' },
  { value: 'NO_SHOW', label: 'No recogido' },
]

export function HistorialFilters({
  availableMonths,
  currentFilters,
}: HistorialFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [localSearch, setLocalSearch] = useState(currentFilters.search || '')

  const updateFilters = (newFilters: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    // Reset página al cambiar filtros
    params.delete('page')

    router.push(`/empleado/historial?${params.toString()}`)
  }

  const clearFilters = () => {
    setLocalSearch('')
    router.push('/empleado/historial')
  }

  const hasActiveFilters =
    currentFilters.month || currentFilters.status || currentFilters.search

  return (
    <Card className="p-4 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        {/* Mes */}
        <div className="w-full md:w-auto md:min-w-[200px]">
          <Select
            value={currentFilters.month?.toISOString() || 'ALL'}
            onValueChange={(value) =>
              updateFilters({ month: value === 'ALL' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los meses</SelectItem>
              {availableMonths.map((month) => (
                <SelectItem key={month.toISOString()} value={month.toISOString()}>
                  {format(month, 'MMMM yyyy', { locale: es })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estado */}
        <div className="w-full md:w-auto md:min-w-[200px]">
          <Select
            value={currentFilters.status || 'ALL'}
            onValueChange={(value) =>
              updateFilters({ status: value === 'ALL' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Búsqueda */}
        <div className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por ID..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateFilters({ search: localSearch || undefined })
                }
              }}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => updateFilters({ search: localSearch || undefined })}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Limpiar */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>
    </Card>
  )
}

