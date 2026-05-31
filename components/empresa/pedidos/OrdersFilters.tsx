'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useCallback } from 'react'

type OrdersFiltersProps = {
  currentFilters: {
    status?: string
    period?: string
    dateFrom?: string
    dateTo?: string
  }
}

export function OrdersFilters({ currentFilters }: OrdersFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Actualizar URL con nuevos filtros
  const updateFilters = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      
      // Resetear página al cambiar filtros
      params.delete('page')
      
      router.push(`/empresa/pedidos?${params.toString()}`)
    },
    [router, searchParams]
  )

  // Limpiar todos los filtros
  const clearFilters = () => {
    router.push('/empresa/pedidos')
  }

  const hasActiveFilters =
    (currentFilters.status && currentFilters.status !== 'all') ||
    (currentFilters.period && currentFilters.period !== 'month') ||
    currentFilters.dateFrom ||
    currentFilters.dateTo

  const showCustomDates = currentFilters.period === 'custom'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        {/* Período */}
        <div className="space-y-2 flex-1">
          <Label htmlFor="period">Período</Label>
          <Select
            value={currentFilters.period || 'month'}
            onValueChange={(value) => updateFilters('period', value)}
          >
            <SelectTrigger id="period">
              <SelectValue placeholder="Selecciona período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estado */}
        <div className="space-y-2 flex-1">
          <Label htmlFor="status">Estado</Label>
          <Select
            value={currentFilters.status || 'all'}
            onValueChange={(value) => updateFilters('status', value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="DRAFT">Borrador</SelectItem>
              <SelectItem value="CONFIRMED">Confirmado</SelectItem>
              <SelectItem value="LOCKED_AFTER_CUTOFF">Bloqueado</SelectItem>
              <SelectItem value="DELIVERED">Entregado</SelectItem>
              <SelectItem value="CANCELLED_BEFORE_CUTOFF">Cancelado</SelectItem>
              <SelectItem value="NO_SHOW">No recogido</SelectItem>
              <SelectItem value="ISSUE_REPORTED">Con incidencia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Limpiar filtros */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Fechas personalizadas */}
      {showCustomDates && (
        <div className="flex flex-col gap-4 md:flex-row md:items-end p-4 rounded-lg border border-primary/30 bg-primary/10">
          <div className="space-y-2 flex-1">
            <Label htmlFor="dateFrom" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fecha Desde
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={currentFilters.dateFrom || ''}
              onChange={(e) => updateFilters('dateFrom', e.target.value)}
            />
          </div>

          <div className="space-y-2 flex-1">
            <Label htmlFor="dateTo" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fecha Hasta
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={currentFilters.dateTo || ''}
              onChange={(e) => updateFilters('dateTo', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

