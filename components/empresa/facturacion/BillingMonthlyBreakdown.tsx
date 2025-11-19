/**
 * Desglose Mensual de Facturación
 * ♻️ Estructura reutilizada del portal de Admin
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Calendar, Download, Eye } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type MonthlyBreakdownProps = {
  breakdown: {
    period: {
      year: number
      month: number
      startDate: Date
      endDate: Date
    }
    summary: {
      totalOrders: number
      subtotal: number
      companyPart: number
      employeePart: number
      commission: number
      subsidyPercentage: number
      commissionRate: number
    }
    catering: {
      name: string
    }
    byEmployee: Array<{
      employeeId: string
      orders: number
      total: number
    }>
  }
  onExport: (format: string) => void
}

export function BillingMonthlyBreakdown({
  breakdown,
  onExport,
}: MonthlyBreakdownProps) {
  const [exportFormat, setExportFormat] = useState<string>('GENERIC')

  const { period, summary, catering, byEmployee } = breakdown

  return (
    <div className="space-y-6">
      {/* Header con período y catering */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {new Date(period.year, period.month - 1).toLocaleDateString('es-ES', {
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <p className="text-sm text-muted-foreground">
            Catering: {catering.name}
          </p>
        </div>

        {/* Selector de formato y exportar */}
        <div className="flex items-center gap-2">
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERIC">Genérico</SelectItem>
              <SelectItem value="A3">A3</SelectItem>
              <SelectItem value="SAGE">Sage</SelectItem>
              <SelectItem value="SAP">SAP</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => onExport(exportFormat)}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Resumen Financiero */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Financiero</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Pedidos</p>
              <p className="text-2xl font-bold">{summary.totalOrders}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subtotal</p>
              <p className="text-2xl font-bold">{summary.subtotal.toFixed(2)}€</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Empresa ({summary.subsidyPercentage}%)
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {summary.companyPart.toFixed(2)}€
              </p>
            </div>
            {summary.employeePart > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Empleado ({100 - summary.subsidyPercentage}%)
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.employeePart.toFixed(2)}€
                </p>
              </div>
            )}
          </div>

          {/* Comisión */}
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Comisión Comida.com ({summary.commissionRate}%)
              </span>
              <span className="font-semibold">{summary.commission.toFixed(2)}€</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desglose por Empleado */}
      <Card>
        <CardHeader>
          <CardTitle>Desglose por Empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Empresa</TableHead>
                {summary.subsidyPercentage < 100 && (
                  <TableHead className="text-right">Empleado</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {byEmployee.map((emp) => (
                <TableRow key={emp.employeeId}>
                  <TableCell>
                    <div className="font-medium">
                      #{emp.employeeId.slice(-8)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{emp.orders}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {emp.total.toFixed(2)}€
                  </TableCell>
                  <TableCell className="text-right text-blue-600">
                    {(emp.total * (summary.subsidyPercentage / 100)).toFixed(2)}€
                  </TableCell>
                  {summary.subsidyPercentage < 100 && (
                    <TableCell className="text-right text-green-600">
                      {(emp.total * ((100 - summary.subsidyPercentage) / 100)).toFixed(2)}€
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {byEmployee.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No hay pedidos en este período
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

