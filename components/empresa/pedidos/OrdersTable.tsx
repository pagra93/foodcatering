'use client'

import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { useRouter } from 'next/navigation'

type Order = {
  id: string
  serviceDate: Date
  status: string
  price: number
  menuType: string
  employee: {
    id: string
    name: string
    email: string
    employeeNumber: string | null
    department: string | null
    site: string
  } | null
}

type OrdersTableProps = {
  orders: Order[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

const statusMap = {
  DRAFT: { label: 'Borrador', variant: 'outline' as const },
  CONFIRMED: { label: 'Confirmado', variant: 'default' as const },
  LOCKED_AFTER_CUTOFF: { label: 'Bloqueado', variant: 'secondary' as const },
  DELIVERED: { label: 'Entregado', variant: 'success' as const },
  CANCELLED_BEFORE_CUTOFF: { label: 'Cancelado', variant: 'destructive' as const },
  CANCELLED_AFTER_CUTOFF: { label: 'Cancelado (tardío)', variant: 'destructive' as const },
  NO_SHOW: { label: 'No recogido', variant: 'warning' as const },
  ISSUE_REPORTED: { label: 'Con incidencia', variant: 'warning' as const },
}

const menuTypeMap = {
  FULL: 'Completo',
  STARTER_MAIN: '1º + 2º',
  MAIN_DESSERT: '2º + Postre',
  MAIN_ONLY: 'Solo 2º',
}

export function OrdersTable({ orders, pagination }: OrdersTableProps) {
  const router = useRouter()

  if (orders.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            No hay pedidos
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            No se encontraron pedidos para los filtros seleccionados
          </p>
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
              <TableHead>Fecha de Servicio</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead>Tipo Menú</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const statusInfo = statusMap[order.status as keyof typeof statusMap] || {
                label: order.status,
                variant: 'outline' as const,
              }
              const menuTypeLabel = menuTypeMap[order.menuType as keyof typeof menuTypeMap] || order.menuType

              return (
                <TableRow key={order.id}>
                  {/* Fecha */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {format(new Date(order.serviceDate), "EEEE, d 'de' MMM", {
                          locale: es,
                        })}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(order.serviceDate), 'yyyy')}
                      </span>
                    </div>
                  </TableCell>

                  {/* Empleado */}
                  <TableCell>
                    {order.employee ? (
                      <div className="flex flex-col">
                        <Link
                          href={`/empresa/empleados/${order.employee.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {order.employee.name}
                        </Link>
                        <span className="text-xs text-gray-500">
                          {order.employee.email}
                        </span>
                        {order.employee.employeeNumber && (
                          <span className="text-xs text-gray-400">
                            #{order.employee.employeeNumber}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </TableCell>

                  {/* Sede */}
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {order.employee?.site || '-'}
                    </span>
                  </TableCell>

                  {/* Tipo Menú */}
                  <TableCell>
                    <span className="text-sm text-gray-900">{menuTypeLabel}</span>
                  </TableCell>

                  {/* Estado */}
                  <TableCell>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </TableCell>

                  {/* Importe */}
                  <TableCell className="text-right font-medium">
                    {order.price.toLocaleString('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </TableCell>

                  {/* Acciones */}
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/empresa/pedidos/${order.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
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
            {pagination.total} pedidos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                params.set('page', (pagination.page - 1).toString())
                router.push(`/empresa/pedidos?${params.toString()}`)
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
                const params = new URLSearchParams(window.location.search)
                params.set('page', (pagination.page + 1).toString())
                router.push(`/empresa/pedidos?${params.toString()}`)
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

