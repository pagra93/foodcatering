'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useState, useCallback } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

type EmployeesFiltersProps = {
  currentFilters: {
    search?: string
    status?: string
    department?: string
  }
  departments: (string | null)[]
}

export function EmployeesFilters({
  currentFilters,
  departments,
}: EmployeesFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentFilters.search || '')

  // Debounce search para no hacer peticiones en cada tecla
  const debouncedSearch = useDebounce(search, 500)

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
      
      router.push(`/empresa/empleados?${params.toString()}`)
    },
    [router, searchParams]
  )

  // Efecto para actualizar search cuando el debounce termina
  useCallback(() => {
    if (debouncedSearch !== currentFilters.search) {
      updateFilters('search', debouncedSearch)
    }
  }, [debouncedSearch])()

  // Limpiar todos los filtros
  const clearFilters = () => {
    setSearch('')
    router.push('/empresa/empleados')
  }

  const hasActiveFilters =
    currentFilters.search ||
    (currentFilters.status && currentFilters.status !== 'all') ||
    (currentFilters.department && currentFilters.department !== 'all')

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      {/* Búsqueda */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="search"
          placeholder="Buscar por nombre, email, número de empleado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Estado */}
      <Select
        value={currentFilters.status || 'all'}
        onValueChange={(value) => updateFilters('status', value)}
      >
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="ACTIVE">Activo</SelectItem>
          <SelectItem value="SUSPENDED">Suspendido</SelectItem>
          <SelectItem value="DISABLED">Deshabilitado</SelectItem>
        </SelectContent>
      </Select>

      {/* Departamento */}
      {departments.length > 0 && (
        <Select
          value={currentFilters.department || 'all'}
          onValueChange={(value) => updateFilters('department', value)}
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los departamentos</SelectItem>
            {departments
              .filter((dept): dept is string => dept !== null)
              .map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}

      {/* Limpiar filtros */}
      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters}>
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}

