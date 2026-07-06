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
import { decryptPII, looksEncrypted } from '@/lib/crypto/pii'

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
  'DeliveryRoute',
  'DeliveryRouteSite',
  // Añadidos (H9): faltaban en la lista original; 'EmployeeInvitation' se retiró
  // (el modelo pasó a llamarse 'UserInvitation').
  'UserInvitation',
  'DishRating',
  'Penalty',
  'Settlement',
  'SaasInvoice',
  'MenuTemplate',
  'DeliveryZone',
  'GdprRequest',
  'DpaAgreement',
  'ActivityMessage',
  'HolidayOverride',
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

/**
 * Guard de aislamiento por tenant (H9, opción B).
 *
 * - Loguea SIEMPRE (todos los entornos) cuando una LECTURA sobre un modelo
 *   multi-tenant no lleva filtro de tenant → visibilidad de olvidos en prod.
 * - BLOQUEA (lanza) sólo si `TENANT_GUARD_ENFORCE=true`, para poder activarlo
 *   tras validar en logs que no hay falsos positivos.
 *
 * Cubre sólo LECTURAS: las escrituras siguen el patrón seguro
 * findFirst({id, tenantId}) → update({ where: { id } }), que deja el update sin
 * filtro a propósito, así que vigilarlas daría falsos positivos.
 *
 * Nota: el portal root/admin lee cross-tenant a propósito; hoy esas lecturas
 * salen como AVISO. Antes de poner `TENANT_GUARD_ENFORCE=true` en prod hay que
 * acotarlas (revisar logs y añadir el escape correspondiente) — ver runbook. No
 * se usa AsyncLocalStorage aquí para mantener este módulo apto para el bundle de
 * cliente (algún componente cliente lo arrastra vía queries).
 */
const TENANT_GUARD_ENFORCE = process.env['TENANT_GUARD_ENFORCE'] === 'true'

prisma.$use(async (params, next) => {
  if (
    params.model &&
    MULTI_TENANT_MODELS.has(params.model) &&
    params.action &&
    READ_ACTIONS.has(params.action)
  ) {
    const args = params.args as { where?: unknown } | undefined
    if (!hasTenantFilter(args?.where)) {
      const msg = `[prisma:tenant-guard] ${params.model}.${params.action} sin filtro de tenant.`
      if (TENANT_GUARD_ENFORCE) {
        throw new Error(`${msg} Bloqueado por TENANT_GUARD_ENFORCE.`)
      }
      // eslint-disable-next-line no-console
      console.warn(`${msg} (aviso; TENANT_GUARD_ENFORCE=true para bloquear)`)
    }
  }
  return next(params)
})

// ─── Descifrado automático de PII en lectura (C4) ──────────────────────────
//
// Los campos `nameEnc` / `phoneEnc` del modelo User se guardan cifrados
// (AES-256-GCM, ver lib/crypto/pii.ts). Este middleware los descifra en CUALQUIER
// resultado de Prisma —incluidos los anidados vía include— para que toda la app
// siga recibiendo el valor en claro sin tener que descifrar en cada sitio.
//
// - En sitio (muta el objeto) para no romper instancias de clase (Date, Decimal).
// - Sólo recorre objetos "planos" y arrays; nunca Date/Decimal/Buffer.
// - Tolerante: si el valor está en texto plano (legado, aún sin migrar) lo deja
//   igual; si falla el descifrado (clave ausente/incorrecta) devuelve el valor
//   original en vez de reventar.
// - Sólo User tiene estos campos, así que la coincidencia por nombre de clave es
//   segura. Las queries `$queryRaw`/backfill no pasan por `$use`, por lo que el
//   script de migración ve el valor crudo.
function decryptPiiInPlace(node: unknown, depth = 0): void {
  if (node === null || typeof node !== 'object' || depth > 8) return
  if (Array.isArray(node)) {
    for (const item of node) decryptPiiInPlace(item, depth + 1)
    return
  }
  if ((node as { constructor?: unknown }).constructor !== Object) return
  const obj = node as Record<string, unknown>
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if ((key === 'nameEnc' || key === 'phoneEnc') && typeof val === 'string') {
      if (looksEncrypted(val)) {
        try {
          obj[key] = decryptPII(val)
        } catch {
          // Clave ausente/incorrecta: dejar el valor tal cual (no enmascarar).
        }
      }
    } else if (val && typeof val === 'object') {
      decryptPiiInPlace(val, depth + 1)
    }
  }
}

prisma.$use(async (params, next) => {
  const result = await next(params)
  if (result && typeof result === 'object') decryptPiiInPlace(result)
  return result
})

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
