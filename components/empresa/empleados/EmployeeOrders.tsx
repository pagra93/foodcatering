'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

type EmployeeOrdersProps = {
  orders: Array<{
    id: string
    serviceDate: Date
    status: string
    price: number
    menuType: string
  }>
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
  FULL: 'Menú completo',
  STARTER_MAIN: '1º + 2º',
  MAIN_DESSERT: '2º + Postre',
  MAIN_ONLY: 'Solo 2º',
}

export function EmployeeOrders({ orders }: EmployeeOrdersProps) {
  if (orders.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-gray-500">
          <p>Este empleado aún no ha realizado ningún pedido</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha de Servicio</TableHead>
              <TableHead>Tipo de Menú</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Importe</TableHead>
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
                  <TableCell>
                    {format(new Date(order.serviceDate), "EEEE, d 'de' MMMM, yyyy", {
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell>{menuTypeLabel}</TableCell>
                  <TableCell>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {order.price.toLocaleString('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

