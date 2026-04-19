/**
 * Prisma Client Singleton
 *
 * Añade dos capas de protección multi-tenant:
 *
 *  1. **Middleware de detección en dev** (`$use`): avisa en consola si una query
 *     sobre un modelo multi-tenant no incluye filtro por tenant. No bloquea, sólo
 *     ilumina olvidos durante desarrollo. En producción se confía en RLS.
 *
 *  2. **Wrapper `withTenantContext`**: ejecuta un bloque dentro de una
 *     transacción con variables de sesión `app.tenant_id` y `app.role` seteadas.
 *     Lo consumen las policies RLS de Postgres (ver la migración SQL).
 */

import { PrismaClient } from '@prisma/client'
import { env } from '@/lib/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Modelos que viven dentro de un tenant. Cualquier find/findMany/findFirst/count
 * sobre estos modelos debería llevar filtro `tenantId` / `tenantEmpresa` /
 * `tenantCatering` en el `where`.
 *
 * La lista contiene **modelos**, no tablas (nombres de Prisma, en PascalCase).
 */
const MULTI_TENANT_MODELS = new Set([
  'User',
  'Employee',
  'Company',
  'CompanySite',
  'CompanyPolicy',
  'CompanyPolicyHistory',
  'CompanySettings',
  'CompanyCateringAssignment',
  'Restaurant',
  'RestaurantDocument',
  'RestaurantAudit',
  'Dish',
  'DishSchedule',
  'Order',
  'OrderHistory',
  'OrderRating',
  'KitchenSheet',
  'PackingSheet',
  'DeliveryEvent',
  'DeliveryProof',
  'Invoice',
  'InvoiceLine',
  'Incident',
  'Notification',
  'DailySnapshot',
  'CompanyExport',
  'FiscalReport',
  'Integration',
  'Webhook',
  'WebhookDelivery',
  'EmployeeInvitation',
  'DeliveryRoute',
])

const READ_ACTIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
])

function hasTenantFilter(where: unknown): boolean {
  if (!where || typeof where !== 'object') return false
  const obj = where as Record<string, unknown>
  return Boolean(
    obj['tenantId'] ||
      obj['tenantEmpresa'] ||
      obj['tenantCatering'] ||
      obj['tenant'] || // filter vía relación
      obj['company'] // algunas queries filtran vía company.tenantId
  )
}

// Sólo en desarrollo: avisa cuando una query multi-tenant olvida el filtro.
// No bloquea la ejecución; sirve para detectar olvidos y mantener disciplina.
if (env.NODE_ENV === 'development') {
  prisma.$use(async (params, next) => {
    if (
      params.model &&
      MULTI_TENANT_MODELS.has(params.model) &&
      params.action &&
      READ_ACTIONS.has(params.action)
    ) {
      const args = params.args as { where?: unknown } | undefined
      if (!hasTenantFilter(args?.where)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[prisma:tenant-check] ${params.model}.${params.action} sin filtro de tenant. Añadir tenantId/tenantEmpresa/tenantCatering al where.`
        )
      }
    }
    return next(params)
  })
}

/**
 * Ejecuta un bloque dentro de una transacción con las variables de sesión
 * Postgres necesarias para que las policies RLS apliquen.
 *
 * Uso típico (cuando RLS esté activo):
 *
 *   const orders = await withTenantContext(tenantId, role, async (tx) =>
 *     tx.order.findMany({ where: { serviceDate: today } })
 *   )
 *
 * Las policies de `orders` comparan `tenant_empresa = current_setting('app.tenant_id')::uuid`
 * y permiten bypass con `app.role = 'super_admin'`. Mientras RLS no esté
 * habilitado todavía en ningún entorno, llamar a este helper es equivalente a
 * ejecutar la query directa — no rompe nada.
 */
export async function withTenantContext<T>(
  tenantId: string,
  role: string,
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const normalizedRole = role.toLowerCase()
    await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${tenantId.replace(/'/g, "''")}'`)
    await tx.$executeRawUnsafe(`SET LOCAL app.role = '${normalizedRole.replace(/'/g, "''")}'`)
    return fn(tx)
  })
}

/**
 * Helper para desconectar en tests
 */
export async function disconnect() {
  await prisma.$disconnect()
}
