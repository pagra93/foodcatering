'use client'

import Link from 'next/link'
import { MoreHorizontal, Eye, Edit, Trash2, Mail, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Employee = {
  id: string
  employeeNumber: string | null
  name: string
  email: string
  department: string | null
  position: string | null
  site: {
    id: string
    name: string
  }
  status: string
  startDate: Date | null
  metrics: {
    ordersLast30Days: number
    totalSpent: number
    lastOrderDate: Date | null
  }
}

type EmployeesTableProps = {
  employees: Employee[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

const statusMap = {
  ACTIVE: { label: 'Activo', variant: 'success' as const },
  SUSPENDED: { label: 'Suspendido', variant: 'warning' as const },
  DISABLED: { label: 'Deshabilitado', variant: 'destructive' as const },
}

export function EmployeesTable({ employees, pagination }: EmployeesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleStatus = async (employeeId: string, currentStatus: string) => {
    if (isLoading) return
    setIsLoading(true)

    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
      const res = await fetch(`/api/empresa/empleados/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Error al actualizar estado')

      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar el estado del empleado')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (employeeId: string) => {
    if (isLoading) return
    if (!confirm('¿Estás seguro de eliminar este empleado?')) return

    setIsLoading(true)

    try {
      const res = await fetch(`/api/empresa/empleados/${employeeId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Error al eliminar')

      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar el empleado')
    } finally {
      setIsLoading(false)
    }
  }

  if (employees.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            No hay empleados
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Comienza añadiendo empleados a tu empresa
          </p>
          <Button asChild className="mt-4">
            <Link href="/empresa/empleados/nuevo" prefetch={false}>Añadir Empleado</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Pedidos (30d)</TableHead>
              <TableHead className="text-right">Gasto Total</TableHead>
              <TableHead className="text-right">Último Pedido</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => {
              const statusInfo = statusMap[employee.status as keyof typeof statusMap] || {
                label: employee.status,
                variant: 'outline' as const,
              }

              return (
                <TableRow key={employee.id}>
                  {/* Empleado */}
                  <TableCell>
                    <div className="flex flex-col">
                      <Link
                        href={`/empresa/empleados/${employee.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                        prefetch={false}
                      >
                        {employee.name}
                      </Link>
                      <span className="text-sm text-gray-500">
                        {employee.email}
                      </span>
                      {employee.employeeNumber && (
                        <span className="text-xs text-gray-400">
                          #{employee.employeeNumber}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Departamento */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900">
                        {employee.department || '-'}
                      </span>
                      {employee.position && (
                        <span className="text-xs text-gray-500">
                          {employee.position}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Sede */}
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {employee.site.name}
                    </span>
                  </TableCell>

                  {/* Estado */}
                  <TableCell>
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.label}
                    </Badge>
                  </TableCell>

                  {/* Pedidos */}
                  <TableCell className="text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {employee.metrics.ordersLast30Days}
                    </span>
                  </TableCell>

                  {/* Gasto Total */}
                  <TableCell className="text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {employee.metrics.totalSpent.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </span>
                  </TableCell>

                  {/* Último Pedido */}
                  <TableCell className="text-right">
                    {employee.metrics.lastOrderDate ? (
                      <span className="text-sm text-gray-600">
                        {format(new Date(employee.metrics.lastOrderDate), 'd MMM', {
                          locale: es,
                        })}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </TableCell>

                  {/* Acciones */}
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
                        <DropdownMenuItem asChild>
                          <Link href={`/empresa/empleados/${employee.id}`} prefetch={false}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/empresa/empleados/${employee.id}/editar`} prefetch={false}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          <Mail className="mr-2 h-4 w-4" />
                          Reenviar invitación
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {employee.status === 'ACTIVE' ? (
                          <DropdownMenuItem
                            className="text-yellow-600"
                            disabled={isLoading}
                            asChild
                          >
                            <button onClick={() => handleToggleStatus(employee.id, employee.status)}>
                              <UserX className="mr-2 h-4 w-4" />
                              Suspender
                            </button>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-green-600"
                            disabled={isLoading}
                            asChild
                          >
                            <button onClick={() => handleToggleStatus(employee.id, employee.status)}>
                              <UserX className="mr-2 h-4 w-4" />
                              Activar
                            </button>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          disabled={isLoading}
                          asChild
                        >
                          <button onClick={() => handleDelete(employee.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </button>
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
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{' '}
            {pagination.total} empleados
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('page', (pagination.page - 1).toString())
                router.push(`/empresa/empleados?${params.toString()}`)
              }}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-600">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('page', (pagination.page + 1).toString())
                router.push(`/empresa/empleados?${params.toString()}`)
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

