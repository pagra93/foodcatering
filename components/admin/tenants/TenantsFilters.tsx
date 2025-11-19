/**
 * Filtros para la lista de Tenants
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useTransition } from 'react'

export function TenantsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'ALL') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Reset page cuando cambian los filtros
    params.delete('page')
    
    startTransition(() => {
      router.push(`/admin/tenants?${params.toString()}`)
    })
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {/* Búsqueda */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Buscar por nombre, subdominio o email..."
              className="pl-10"
              defaultValue={searchParams.get('search') || ''}
              onChange={(e) => {
                const value = e.target.value
                // Debounce
                setTimeout(() => {
                  updateFilters('search', value)
                }, 500)
              }}
            />
          </div>

          {/* Filtro por Tipo */}
          <Select
            defaultValue={searchParams.get('type') || 'ALL'}
            onValueChange={(value) => updateFilters('type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los tipos</SelectItem>
              <SelectItem value="EMPRESA">Empresas</SelectItem>
              <SelectItem value="CATERING">Caterings</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por Estado */}
          <Select
            defaultValue={searchParams.get('status') || 'ALL'}
            onValueChange={(value) => updateFilters('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="ACTIVE">Activos</SelectItem>
              <SelectItem value="SUSPENDED">Suspendidos</SelectItem>
              <SelectItem value="INACTIVE">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isPending && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Aplicando filtros...
          </div>
        )}
      </CardContent>
    </Card>
  )
}

