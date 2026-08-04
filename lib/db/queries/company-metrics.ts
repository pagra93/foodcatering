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
import { Prisma } from '@prisma/client'
import { startOfMonth } from 'date-fns'

export type CompanyAdoption = {
  totalEmployees: number
  activeEmployees: number
  adoptionRate: number // %
}

const EMPTY_ADOPTION: CompanyAdoption = {
  totalEmployees: 0,
  activeEmployees: 0,
  adoptionRate: 0,
}

/**
 * Variante batch: adopción de VARIAS empresas con 2 queries agregadas en SQL
 * en TOTAL (denominador y numerador), en vez de 2 queries POR empresa.
 * Misma definición canónica que la individual.
 */
export async function getCompaniesAdoption(
  tenantIds: string[]
): Promise<Map<string, CompanyAdoption>> {
  const result = new Map<string, CompanyAdoption>()
  if (tenantIds.length === 0) return result

  const monthStart = startOfMonth(new Date())

  const [totalsByTenant, activeByTenant] = await Promise.all([
    // Denominador: empleados ACTIVE por tenant, agregado en una query.
    prisma.employee.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: tenantIds }, status: 'ACTIVE', deletedAt: null },
      _count: { _all: true },
    }),
    // Numerador: COUNT(DISTINCT) agregado en Postgres. `findMany({ distinct })`
    // sin el preview nativeDistinct traería todos los pedidos a Node para
    // deduplicar en JS.
    prisma.$queryRaw<{ tenant_empresa: string; active: number }[]>`
      SELECT tenant_empresa, COUNT(DISTINCT employee_id)::int AS active
      FROM orders
      WHERE tenant_empresa IN (${Prisma.join(tenantIds)})
        AND service_date >= ${monthStart}
        AND deleted_at IS NULL
      GROUP BY tenant_empresa
    `,
  ])

  const totalMap = new Map(
    totalsByTenant.map((t) => [t.tenantId, t._count._all])
  )
  const activeMap = new Map(
    activeByTenant.map((a) => [a.tenant_empresa, a.active])
  )

  for (const tenantId of tenantIds) {
    const totalEmployees = totalMap.get(tenantId) ?? 0
    const activeEmployees = activeMap.get(tenantId) ?? 0
    result.set(tenantId, {
      totalEmployees,
      activeEmployees,
      adoptionRate:
        totalEmployees > 0
          ? Math.round((activeEmployees / totalEmployees) * 100)
          : 0,
    })
  }

  return result
}

export async function getCompanyAdoption(tenantId: string): Promise<CompanyAdoption> {
  const adoption = await getCompaniesAdoption([tenantId])
  return adoption.get(tenantId) ?? EMPTY_ADOPTION
}
