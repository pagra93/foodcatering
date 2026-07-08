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

import 'server-only' // RLS: este módulo (y el contexto de tenant) nunca en cliente
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
  'CompanySettings',
  'CompanyCateringAssignment',
  'Restaurant',
  'RestaurantDocument',
  'RestaurantAudit',
  'Dish',
  'DishSchedule',
  'Order',
  'Invoice',
  'Incident',
  'Notification',
  'FiscalReport',
  'DeliveryRoute',
  'UserInvitation',
  'DishRating',
  'Penalty',
  'Settlement',
  'SaasInvoice',
  'MenuTemplate',
  'DeliveryZone',
  'GdprRequest',
  'DpaAgreement',
  'HolidayOverride',
  // NOTA: los modelos SIN columna de tenant propia (OrderHistory, OrderRating,
  // DeliveryProof, InvoiceLine, DeliveryRouteSite, ActivityMessage,
  // CompanyPolicyHistory) NO van aquí: el guard de app no puede exigirles un
  // filtro de tenant (no lo tienen). Su aislamiento va por la tabla padre
  // (order/invoice/route), que sí se filtra, o por RLS a nivel BD (EXISTS).
])

// El guard vigila lecturas que pueden devolver filas de VARIOS tenants sin
// filtro. `findUnique`/`findUniqueOrThrow` se EXIMEN: devuelven una sola fila por
// clave única (normalmente el id) y el patrón `findUnique({ id })` está muy
// extendido en toda la app (el llamante valida la propiedad sobre la fila). El
// riesgo real de fuga está en listados/agregados sin filtro de tenant.
const READ_ACTIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
])

export function hasTenantFilter(where: unknown): boolean {
  if (!where || typeof where !== 'object') return false
  const obj = where as Record<string, unknown>
  if (
    obj['tenantId'] ||
    obj['tenantEmpresa'] ||
    obj['tenantCatering'] ||
    obj['tenant'] || // filter vía relación
    obj['company'] // algunas queries filtran vía company.tenantId
  ) {
    return true
  }
  // Descender en combinadores AND/OR (objeto o array anidado) para no marcar
  // como "sin filtro" una query que sí lo lleva anidado (evita falsos positivos
  // al activar el enforcement).
  for (const key of ['AND', 'OR'] as const) {
    const branch = obj[key]
    if (Array.isArray(branch)) {
      if (branch.some((b) => hasTenantFilter(b))) return true
    } else if (branch && hasTenantFilter(branch)) {
      return true
    }
  }
  return false
}

/**
 * Guard de aislamiento por tenant (H9, opción A — enforced).
 *
 * BLOQUEA (lanza) las LECTURAS de lista/agregado sobre un modelo multi-tenant que
 * no lleven filtro de tenant ni acotación por entidad (id/employeeId). Está
 * ACTIVO por defecto; válvula de escape sin redeploy: `TENANT_GUARD_ENFORCE=false`.
 *
 * Cubre sólo LECTURAS de lista/agregado (findMany/findFirst/count/aggregate/
 * groupBy). `findUnique` y las lecturas acotadas por entidad se eximen
 * (ver isBoundedLookup). Las escrituras siguen el patrón seguro
 * findFirst({id, tenantId}) → update({ where: { id } }).
 *
 * El portal admin lee cross-tenant a propósito → usa `prismaAdmin` (cliente sin
 * guard, ver lib/db/prisma-admin.ts). Barrido de ~75 funciones de lectura de los
 * 4 portales: 0 disparos. No se usa AsyncLocalStorage aquí (se mantiene el módulo
 * server-only + apto para su cadena de imports).
 */
const TENANT_GUARD_ENFORCE = process.env['TENANT_GUARD_ENFORCE'] !== 'false'

/**
 * Lectura ACOTADA a las filas de una entidad concreta → se exime del guard igual
 * que `findUnique`, porque no puede devolver filas de "muchos" tenants a ciegas:
 *  - `id` (escalar o `{ in: [...] }`): hidratación por clave primaria; los ids ya
 *    vienen de una consulta scoped previa (`dish.findMany({ where: { id: { in } } })`).
 *  - `employeeId`: acota a los datos de UN empleado (que pertenece a un tenant);
 *    es el patrón del portal empleado (ve SUS pedidos/incidencias/historial).
 *  - `token`: campo único secreto (p. ej. aceptar invitación por enlace, flujo
 *    público sin sesión) → devuelve una sola fila por un secreto de alta entropía.
 * El riesgo real de fuga está en listados/agregados por atributo (status, fecha…)
 * sin acotar, no en estos lookups por entidad.
 */
function isBoundedLookup(where: unknown): boolean {
  if (!where || typeof where !== 'object') return false
  const w = where as object
  return 'id' in w || 'employeeId' in w || 'token' in w
}

prisma.$use(async (params, next) => {
  if (
    params.model &&
    MULTI_TENANT_MODELS.has(params.model) &&
    params.action &&
    READ_ACTIONS.has(params.action)
  ) {
    const args = params.args as { where?: unknown } | undefined
    if (!hasTenantFilter(args?.where) && !isBoundedLookup(args?.where)) {
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
