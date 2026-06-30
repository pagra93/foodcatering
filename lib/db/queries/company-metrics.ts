/**
 * Definición CANÓNICA de adopción/empleados de una empresa.
 *
 * Única fuente para TODAS las pantallas (detalle admin, lista admin, portal
 * empresa) para que la misma empresa muestre el mismo número en todos lados.
 *
 * - Denominador (total): empleados con `status=ACTIVE` de la empresa, sin
 *   filtrar por sede.
 * - Numerador (activos): empleados distintos que han pedido en el MES natural
 *   en curso.
 */

import { prisma } from '@/lib/db/prisma'
import { startOfMonth } from 'date-fns'

export type CompanyAdoption = {
  totalEmployees: number
  activeEmployees: number
  adoptionRate: number // %
}

export async function getCompanyAdoption(tenantId: string): Promise<CompanyAdoption> {
  const monthStart = startOfMonth(new Date())

  const [totalEmployees, activeRows] = await Promise.all([
    prisma.employee.count({
      where: { tenantId, status: 'ACTIVE', deletedAt: null },
    }),
    prisma.order.findMany({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: monthStart },
        deletedAt: null,
      },
      select: { employeeId: true },
      distinct: ['employeeId'],
    }),
  ])

  const activeEmployees = activeRows.length
  const adoptionRate =
    totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 0

  return { totalEmployees, activeEmployees, adoptionRate }
}
