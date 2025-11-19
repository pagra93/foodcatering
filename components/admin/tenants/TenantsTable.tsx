/**
 * Tabla de Tenants con acciones
 */

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { MoreHorizontal, Eye, Edit, Ban, CheckCircle, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Tenant = {
  id: string
  name: string
  type: string
  subdomain: string
  status: string
  primaryColor: string | null
  logoUrl: string | null
  contactEmail: string | null
  contactPhone: string | null
  createdAt: Date
  updatedAt: Date
  _count: {
    users: number
    companies: number
    restaurants: number
  }
}

type TenantsTableProps = {
  tenants: Tenant[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export function TenantsTable({ tenants, pagination }: TenantsTableProps) {
  const router = useRouter()
  
  // Determinar el tipo de tenant basado en la ruta actual o el primer tenant
  const tenantType = tenants[0]?.type || 'EMPRESA'
  const baseRoute = tenantType === 'EMPRESA' ? '/admin/empresas' : '/admin/caterings'

  if (tenants.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <p className="mt-4 text-base font-semibold text-gray-900">
            No se encontraron {tenantType === 'EMPRESA' ? 'empresas' : 'caterings'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Prueba cambiando los filtros o crea un nuevo {tenantType === 'EMPRESA' ? 'empresa' : 'catering'}
          </p>
          <Button asChild className="mt-6">
            <Link href={`${baseRoute}/new`}>Crear {tenantType === 'EMPRESA' ? 'Empresa' : 'Catering'}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-100 bg-gray-50/50">
              <TableHead className="text-gray-700 font-semibold">Nombre</TableHead>
              <TableHead className="text-gray-700 font-semibold">Tipo</TableHead>
              <TableHead className="text-gray-700 font-semibold">Subdominio</TableHead>
              <TableHead className="text-gray-700 font-semibold">Estado</TableHead>
              <TableHead className="text-gray-700 font-semibold">Usuarios</TableHead>
              <TableHead className="text-gray-700 font-semibold">Relaciones</TableHead>
              <TableHead className="text-gray-700 font-semibold">Creado</TableHead>
              <TableHead className="w-[100px] text-gray-700 font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => {
              const detailRoute = tenant.type === 'EMPRESA' ? `/admin/empresas/${tenant.id}` : `/admin/caterings/${tenant.id}`
              return (
              <TableRow key={tenant.id} className="border-gray-100 hover:bg-gray-50 transition-colors">
                <TableCell>
                  <Link
                    href={detailRoute}
                    className="flex items-center gap-3 hover:text-blue-600 transition-colors"
                  >
                    {tenant.logoUrl ? (
                      <img
                        src={tenant.logoUrl}
                        alt={tenant.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg font-semibold text-white text-xs"
                        style={{ backgroundColor: tenant.primaryColor || '#3B82F6' }}
                      >
                        {tenant.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{tenant.name}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={tenant.type === 'EMPRESA' ? 'default' : 'secondary'}>
                    {tenant.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm text-gray-600">
                  {tenant.subdomain}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      tenant.status === 'ACTIVE'
                        ? 'success'
                        : tenant.status === 'SUSPENDED'
                        ? 'warning'
                        : 'destructive'
                    }
                  >
                    {tenant.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{tenant._count.users}</TableCell>
                <TableCell className="text-sm">
                  {tenant.type === 'EMPRESA'
                    ? tenant._count.companies
                    : tenant._count.restaurants}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {formatDistanceToNow(tenant.createdAt, {
                    addSuffix: true,
                    locale: es,
                  })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => router.push(detailRoute)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`${detailRoute}/edit`)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {tenant.status === 'ACTIVE' ? (
                        <DropdownMenuItem className="text-yellow-600">
                          <Ban className="mr-2 h-4 w-4" />
                          Suspender
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className="text-green-600">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Activar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{' '}
            {pagination.total} tenants
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                params.set('page', String(pagination.page - 1))
                router.push(`${window.location.pathname}?${params.toString()}`)
              }}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                params.set('page', String(pagination.page + 1))
                router.push(`${window.location.pathname}?${params.toString()}`)
              }}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

