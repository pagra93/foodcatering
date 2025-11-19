'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { DISH_COURSE_LABELS, type DishCourse } from '@/lib/validations/dish'

type DishesFiltersProps = {
  filters: {
    search: string
    course: string
    active: string
  }
  onFiltersChange: (filters: {
    search: string
    course: string
    active: string
  }) => void
  onReset: () => void
}

export function DishesFilters({
  filters,
  onFiltersChange,
  onReset,
}: DishesFiltersProps) {
  const hasActiveFilters =
    filters.search || filters.course || filters.active !== 'all'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Búsqueda */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o ingredientes..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="pl-10"
          />
        </div>

        {/* Tipo de plato */}
        <Select
          value={filters.course}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, course: value })
          }
        >
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Tipo de plato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {(Object.entries(DISH_COURSE_LABELS) as [DishCourse, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {/* Estado */}
        <Select
          value={filters.active}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, active: value })
          }
        >
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Activos</SelectItem>
            <SelectItem value="false">Inactivos</SelectItem>
          </SelectContent>
        </Select>

        {/* Botón limpiar filtros */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="shrink-0"
          >
            <X className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Indicador de filtros activos */}
      {hasActiveFilters && (
        <div className="text-sm text-gray-600">
          Mostrando resultados filtrados
        </div>
      )}
    </div>
  )
}

