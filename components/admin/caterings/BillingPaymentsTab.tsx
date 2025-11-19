/**
 * Tab de Facturación & Pagos para Caterings
 * Incluye: Facturas emitidas, Liquidaciones, Comisiones, Descargas
 */

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Euro,
  FileText,
  Download,
  Eye,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Percent,
  Building2,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type BillingPaymentsTabProps = {
  restaurant: {
    commission: number
    minimumBilling: number
    paymentCycle: string
  }
  cateringId: string
}

// Datos mock para facturas
const getMockInvoices = () => [
  {
    id: 'INV-2024-001',
    company: 'Tech Solutions',
    period: 'Noviembre 2024',
    startDate: new Date('2024-11-01'),
    endDate: new Date('2024-11-30'),
    totalOrders: 125,
    subtotal: 937.5,
    commission: 46.88,
    total: 890.62,
    status: 'PAID',
    paidAt: new Date('2024-11-05'),
  },
  {
    id: 'INV-2024-002',
    company: 'StartupXYZ',
    period: 'Noviembre 2024',
    startDate: new Date('2024-11-01'),
    endDate: new Date('2024-11-30'),
    totalOrders: 85,
    subtotal: 637.5,
    commission: 31.88,
    total: 605.62,
    status: 'PENDING',
    paidAt: null,
  },
  {
    id: 'INV-2024-003',
    company: 'Consulting Corp',
    period: 'Noviembre 2024',
    startDate: new Date('2024-11-01'),
    endDate: new Date('2024-11-30'),
    totalOrders: 160,
    subtotal: 1200.0,
    commission: 60.0,
    total: 1140.0,
    status: 'OVERDUE',
    paidAt: null,
  },
]

// Datos mock para liquidaciones
const getMockSettlements = () => [
  {
    id: 'SET-2024-10',
    period: 'Octubre 2024',
    totalOrders: 450,
    grossAmount: 3375.0,
    commission: 168.75,
    netAmount: 3206.25,
    status: 'PAID',
    paidAt: new Date('2024-11-05'),
  },
  {
    id: 'SET-2024-11',
    period: 'Noviembre 2024',
    totalOrders: 370,
    grossAmount: 2775.0,
    commission: 138.75,
    netAmount: 2636.25,
    status: 'PENDING',
    paidAt: null,
  },
]

// Histórico de comisiones
const getMockCommissionHistory = () => [
  {
    id: '1',
    effectiveFrom: new Date('2024-01-01'),
    effectiveTo: new Date('2024-06-30'),
    rate: 0.08,
    reason: 'Lanzamiento inicial',
  },
  {
    id: '2',
    effectiveFrom: new Date('2024-07-01'),
    effectiveTo: null,
    rate: 0.05,
    reason: 'Ajuste por volumen',
  },
]

export function BillingPaymentsTab({
  restaurant,
  cateringId,
}: BillingPaymentsTabProps) {
  const [filterPeriod, setFilterPeriod] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const invoices = getMockInvoices()
  const settlements = getMockSettlements()
  const commissionHistory = getMockCommissionHistory()

  // Calcular KPIs
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0)
  const totalPaid = invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.total, 0)
  const totalPending = invoices
    .filter((inv) => inv.status === 'PENDING')
    .reduce((sum, inv) => sum + inv.total, 0)
  const totalOverdue = invoices
    .filter((inv) => inv.status === 'OVERDUE')
    .reduce((sum, inv) => sum + inv.total, 0)

  // Filtrar facturas
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus =
      filterStatus === 'all' || invoice.status === filterStatus
    return matchesStatus
  })

  // Helper para obtener el color del badge según el estado
  const getInvoiceStatusColor = (
    status: string
  ): 'success' | 'warning' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'PAID':
        return 'success'
      case 'PENDING':
        return 'warning'
      case 'OVERDUE':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getInvoiceStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      PAID: 'Pagada',
      PENDING: 'Pendiente',
      OVERDUE: 'Vencida',
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Facturación & Pagos
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Gestión de facturas, liquidaciones y comisiones
        </p>
      </div>

      {/* KPIs Financieros */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Facturado
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalInvoiced.toFixed(2)}€
                </p>
              </div>
              <Euro className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Cobrado</p>
                <p className="text-2xl font-bold text-green-600">
                  {totalPaid.toFixed(2)}€
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pendiente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {totalPending.toFixed(2)}€
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Vencido</p>
                <p className="text-2xl font-bold text-red-600">
                  {totalOverdue.toFixed(2)}€
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comisión Actual */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-blue-100">
                <Percent className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Comisión Vigente
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {(restaurant.commission * 100).toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Ciclo de pago: {restaurant.paymentCycle}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-600">
                Facturación Mínima
              </p>
              <p className="text-xl font-bold text-gray-900">
                {restaurant.minimumBilling.toFixed(2)}€
              </p>
              <p className="text-xs text-gray-500 mt-1">mensual garantizada</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Facturas Emitidas a Empresas */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Facturas Emitidas a Empresas
            </CardTitle>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="PAID">Pagadas</SelectItem>
                  <SelectItem value="PENDING">Pendientes</SelectItem>
                  <SelectItem value="OVERDUE">Vencidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Factura</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-gray-500"
                  >
                    <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm">No se encontraron facturas</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-gray-50">
                    <TableCell>
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {invoice.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {invoice.company}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {invoice.period}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {invoice.totalOrders}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-900">
                        {invoice.subtotal.toFixed(2)}€
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-red-600">
                        -{invoice.commission.toFixed(2)}€
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold text-gray-900">
                        {invoice.total.toFixed(2)}€
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getInvoiceStatusColor(invoice.status)}>
                        {getInvoiceStatusLabel(invoice.status)}
                      </Badge>
                      {invoice.paidAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          {format(invoice.paidAt, 'dd/MM/yyyy', { locale: es })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Resumen de facturas */}
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Total Facturas</p>
                <p className="text-lg font-bold text-gray-900">
                  {invoices.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Pedidos</p>
                <p className="text-lg font-bold text-gray-900">
                  {invoices.reduce((sum, inv) => sum + inv.totalOrders, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Comisión Total</p>
                <p className="text-lg font-bold text-red-600">
                  {invoices
                    .reduce((sum, inv) => sum + inv.commission, 0)
                    .toFixed(2)}
                  €
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Neto</p>
                <p className="text-lg font-bold text-green-600">
                  {invoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2)}€
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liquidaciones al Catering */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Liquidaciones al Catering
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Liquidación</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Importe Bruto</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Importe Neto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.map((settlement) => (
                <TableRow key={settlement.id} className="hover:bg-gray-50">
                  <TableCell>
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {settlement.id}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {settlement.period}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {settlement.totalOrders}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-900">
                      {settlement.grossAmount.toFixed(2)}€
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-red-600">
                      -{settlement.commission.toFixed(2)}€
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-base font-bold text-green-600">
                      {settlement.netAmount.toFixed(2)}€
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        settlement.status === 'PAID' ? 'success' : 'warning'
                      }
                    >
                      {settlement.status === 'PAID' ? 'Pagada' : 'Pendiente'}
                    </Badge>
                    {settlement.paidAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        {format(settlement.paidAt, 'dd/MM/yyyy', { locale: es })}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Histórico de Comisiones */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Percent className="h-5 w-5 text-purple-600" />
            Histórico de Comisiones
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {commissionHistory.map((record, index) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full ${
                      index === 0 ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    {index === 0 ? (
                      <TrendingDown className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {(record.rate * 100).toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-500">{record.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {format(record.effectiveFrom, 'dd/MM/yyyy', { locale: es })}
                    {' → '}
                    {record.effectiveTo
                      ? format(record.effectiveTo, 'dd/MM/yyyy', { locale: es })
                      : 'Actualidad'}
                  </p>
                  {index === 0 && (
                    <Badge variant="success" className="mt-1">
                      Vigente
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Opciones de Descarga */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            Descargas y Exportaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* PDF Facturas */}
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start gap-3">
                <Receipt className="h-6 w-6 text-red-600 mt-1" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900">
                    Facturas en PDF
                  </h4>
                  <p className="text-xs text-red-700 mt-1">
                    Descarga las facturas individuales o en lote para archivo y
                    contabilidad
                  </p>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDFs
                  </Button>
                </div>
              </div>
            </div>

            {/* CSV Líneas */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-6 w-6 text-green-600 mt-1" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-green-900">
                    Líneas en CSV
                  </h4>
                  <p className="text-xs text-green-700 mt-1">
                    Exporta el detalle por empresa, empleado y día para análisis
                  </p>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

