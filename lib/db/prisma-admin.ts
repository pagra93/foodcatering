/**
 * Cliente Prisma para lecturas de ADMIN cross-tenant (F5).
 *
 * El panel de super admin lee a propósito datos de TODOS los tenants (paneles
 * globales, reputación, facturación agregada…). El cliente normal (`prisma`)
 * lleva el guard de aislamiento que bloquea lecturas sin filtro de tenant cuando
 * `TENANT_GUARD_ENFORCE=true`; ese guard rompería esas vistas. Este cliente NO
 * lleva el guard, pero SÍ mantiene el descifrado de PII.
 *
 * Úsalo SOLO en consultas cross-tenant de admin (lib/db/queries/admin-*.ts y las
 * funciones globales de ratings.ts), nunca en código de portal (empresa/catering/
 * empleado), que debe seguir usando `prisma` (guardado). Sólo lo importan
 * ficheros de servidor (queries), así que no entra en el bundle de cliente.
 */

import { PrismaClient } from '@prisma/client'
import { env } from '@/lib/env'
import { decryptPII, looksEncrypted } from '@/lib/crypto/pii'

const globalForPrismaAdmin = globalThis as unknown as {
  prismaAdmin: PrismaClient | undefined
}

export const prismaAdmin =
  globalForPrismaAdmin.prismaAdmin ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  globalForPrismaAdmin.prismaAdmin = prismaAdmin
}

// Descifrado de PII en lectura (idéntico al de prisma.ts). Sin guard de tenant.
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
          // Clave ausente/incorrecta: dejar el valor tal cual.
        }
      }
    } else if (val && typeof val === 'object') {
      decryptPiiInPlace(val, depth + 1)
    }
  }
}

prismaAdmin.$use(async (params, next) => {
  const result = await next(params)
  if (result && typeof result === 'object') decryptPiiInPlace(result)
  return result
})
