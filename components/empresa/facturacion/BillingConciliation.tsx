/**
 * Conciliación de Facturación
 * Detecta pedidos con incidencias o sin trazabilidad
 * ♻️ Estructura reutilizada del portal de Admin
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  Eye,
  FileWarning,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Prisma } from '@prisma/client'

type ConciliationProps = {
  report: {
    summary: {
      totalOrders: number
      subtotal: number
      companyPart: number
      employeePart: number
      commission: number
      subsidyPercentage: number
      commissionRate: number
    }
    issues: {
      ordersWithOpenIncidents: number
      ordersWithoutProof: number
      affectedAmount: number
    }
    ordersWithIncidents: Array<{
      id: string
      serviceDate: Date
      price: Prisma.Decimal | number
      incidents: Array<{
        id: string
        type: string
        severity: string
      }>
    }>
  }
}

export function BillingConciliation({ report }: ConciliationProps) {
  const { summary, issues, ordersWithIncidents } = report

  const hasIssues =
    issues.ordersWithOpenIncidents > 0 || issues.ordersWithoutProof > 0

  const statusIcon = hasIssues ? XCircle : CheckCircle2
  const StatusIcon = statusIcon

  return (
    <div className="space-y-6">
      {/* Estado de Conciliación */}
      <Alert variant={hasIssues ? 'destructive' : 'default'}>
        <StatusIcon className="h-4 w-4" />
        <AlertTitle>
          {hasIssues ? 'Hay problemas de conciliación' : 'Conciliación correcta'}
        </AlertTitle>
        <AlertDescription>
          {hasIssues
            ? 'Se detectaron pedidos con incidencias abiertas o sin justificante de entrega.'
            : 'Todos los pedidos tienen trazabilidad completa y sin incidencias pendientes.'}
        </AlertDescription>
      </Alert>

      {/* KPIs de Conciliación */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {summary.subtotal.toFixed(2)}€
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Con Incidencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {issues.ordersWithOpenIncidents}
            </div>
            <p className="text-xs text-muted-foreground">
              {issues.affectedAmount.toFixed(2)}€ afectados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Sin Justificante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {issues.ordersWithoutProof}
            </div>
            <p className="text-xs text-muted-foreground">
              Falta trazabilidad
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={hasIssues ? 'destructive' : 'default'}
              className="text-lg"
            >
              {hasIssues ? 'Pendiente' : 'OK'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Listado de Pedidos con Problemas */}
      {ordersWithIncidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-red-600" />
              Pedidos con Incidencias Abiertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Incidencias</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersWithIncidents.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">#{order.id.slice(-8)}</div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.serviceDate), 'dd/MM/yyyy', {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {Number(order.price).toFixed(2)}€
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {order.incidents.map((incident) => (
                          <Badge
                            key={incident.id}
                            variant={
                              incident.severity === 'HIGH'
                                ? 'destructive'
                                : 'default'
                            }
                          >
                            {incident.type}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">
                        <Eye className="mr-1 h-3 w-3" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sin problemas */}
      {!hasIssues && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <h3 className="text-lg font-semibold">
                ¡Facturación sin problemas!
              </h3>
              <p className="text-sm text-muted-foreground">
                Todos los pedidos tienen trazabilidad completa y no hay
                incidencias pendientes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

