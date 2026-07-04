/**
 * Visor de AuditLog (traza tamper-evident) para Compliance. Cross-tenant: el
 * super admin ve todas las acciones registradas. Molde de getSettlements.
 */

import { prisma } from '@/lib/db/prisma'
import type { AuditAction, Prisma } from '@prisma/client'
import { decryptNameSafe } from '@/lib/crypto/pii'

export type AuditFilters = {
  action?: AuditAction
  entity?: string
  entityId?: string
  page?: number
  pageSize?: number
}

export async function getAuditLog(filters: AuditFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 30))

  const where: Prisma.AuditLogWhereInput = {
    ...(filters.action && { action: filters.action }),
    ...(filters.entity && { entity: filters.entity }),
    ...(filters.entityId && { entityId: { contains: filters.entityId } }),
  }

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  // Resolver actor (nombre PII descifrado) y tenant en bloque.
  const actorIds = [...new Set(rows.map((r) => r.actorId))]
  const tenantIds = [...new Set(rows.map((r) => r.tenantId).filter((x): x is string => !!x))]
  const [actors, tenants] = await Promise.all([
    actorIds.length
      ? prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, email: true, nameEnc: true },
        })
      : [],
    tenantIds.length
      ? prisma.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true },
        })
      : [],
  ])
  const actorById = new Map(actors.map((a) => [a.id, a]))
  const tenantById = new Map(tenants.map((t) => [t.id, t]))

  return {
    rows: rows.map((r) => {
      const actor = actorById.get(r.actorId)
      return {
        id: r.id,
        timestamp: r.timestamp,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        actorId: r.actorId,
        actorName: actor ? decryptNameSafe(actor.nameEnc) : 'Sistema / desconocido',
        actorEmail: actor?.email ?? null,
        tenantName: r.tenantId ? tenantById.get(r.tenantId)?.name ?? '—' : '—',
        hashShort: r.hash.slice(0, 12),
      }
    }),
    total,
    page,
    pageSize,
  }
}

/** Entidades distintas presentes en la traza, para el filtro. */
export async function getAuditEntities() {
  const rows = await prisma.auditLog.findMany({
    distinct: ['entity'],
    select: { entity: true },
    orderBy: { entity: 'asc' },
  })
  return rows.map((r) => r.entity)
}
