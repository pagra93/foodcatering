'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, Euro } from 'lucide-react'

type EmployeesKPIsProps = {
  total: number
  active: number
  totalSpent: number
}

export function EmployeesKPIs({ total, active, totalSpent }: EmployeesKPIsProps) {
  const adoptionRate = total > 0 ? Math.round((active / total) * 100) : 0
  const avgSpendPerEmployee = total > 0 ? totalSpent / total : 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Empleados
          </CardTitle>
          <Users className="h-5 w-5 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <p className="text-xs text-gray-500 mt-1">Empleados registrados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Empleados Activos
          </CardTitle>
          <UserCheck className="h-5 w-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{active}</div>
          <p className="text-xs text-gray-500 mt-1">
            {adoptionRate}% con pedidos últimos 30 días
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Gasto Promedio
          </CardTitle>
          <Euro className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {avgSpendPerEmployee.toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1">Por empleado (histórico)</p>
        </CardContent>
      </Card>
    </div>
  )
}

