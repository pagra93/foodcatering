/**
 * KPIs de Facturación
 * ♻️ Estructura reutilizada del portal de Admin
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Euro, ShoppingCart, TrendingUp, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type BillingKPIsProps = {
  summary: {
    thisMonth: {
      totalOrders: number
      totalAmount: number
      companyPart: number
      employeePart: number
    }
    lastMonth: {
      totalOrders: number
      totalAmount: number
    }
    unpaidInvoices: number
    subsidyPercentage: number
  }
}

export function BillingKPIs({ summary }: BillingKPIsProps) {
  const { thisMonth, lastMonth, unpaidInvoices, subsidyPercentage } = summary

  // Calcular variación
  const amountChange =
    lastMonth.totalAmount > 0
      ? ((thisMonth.totalAmount - lastMonth.totalAmount) / lastMonth.totalAmount) * 100
      : 0

  const ordersChange =
    lastMonth.totalOrders > 0
      ? ((thisMonth.totalOrders - lastMonth.totalOrders) / lastMonth.totalOrders) * 100
      : 0

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Total del mes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Mes</CardTitle>
          <Euro className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {thisMonth.totalAmount.toFixed(2)}€
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={amountChange >= 0 ? 'default' : 'destructive'}>
              {amountChange >= 0 ? '+' : ''}
              {amountChange.toFixed(1)}%
            </Badge>
            vs mes anterior
          </div>
        </CardContent>
      </Card>

      {/* Pedidos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{thisMonth.totalOrders}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={ordersChange >= 0 ? 'default' : 'destructive'}>
              {ordersChange >= 0 ? '+' : ''}
              {ordersChange.toFixed(1)}%
            </Badge>
            vs mes anterior
          </div>
        </CardContent>
      </Card>

      {/* Split Empresa/Empleado */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Split Pago</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Empresa ({subsidyPercentage}%):</span>
              <span className="font-semibold">{thisMonth.companyPart.toFixed(2)}€</span>
            </div>
            {subsidyPercentage < 100 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Empleado ({100 - subsidyPercentage}%):</span>
                <span className="font-semibold">{thisMonth.employeePart.toFixed(2)}€</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Facturas pendientes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{unpaidInvoices}</div>
          <p className="text-xs text-muted-foreground">Facturas sin pagar</p>
        </CardContent>
      </Card>
    </div>
  )
}

