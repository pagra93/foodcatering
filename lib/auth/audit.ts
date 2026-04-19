/**
 * Sistema de auditoría
 * Registra acciones de usuarios en audit_logs
 */

import { prisma } from '@/lib/db'
import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import type { AuditAction } from '@prisma/client'

type AuditLogInput = {
  tenantId?: string | null
  actorId: string
  action: AuditAction
  entity: string
  entityId: string
  diff?: Record<string, unknown>
  ip?: string
  userAgent?: string
}

/**
 * Crear hash de integridad para el log
 */
function createIntegrityHash(data: AuditLogInput): string {
  const content = JSON.stringify({
    tenantId: data.tenantId,
    actorId: data.actorId,
    action: data.action,
    entity: data.entity,
    entityId: data.entityId,
    timestamp: Date.now(),
  })

  return createHash('sha256').update(content).digest('hex')
}

/**
 * Registrar una acción en audit_logs
 */
export async function logAudit(input: AuditLogInput) {
  try {
    const hash = createIntegrityHash(input)

    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        diff: input.diff ? (input.diff as Prisma.InputJsonValue) : Prisma.JsonNull,
        ip: input.ip || null,
        userAgent: input.userAgent || null,
        hash,
      },
    })
  } catch (error) {
    // Log error pero no fallar la operación principal
    console.error('Error al registrar audit log:', error)
  }
}

/**
 * Obtener headers de request para auditoría
 */
export function getAuditHeaders(req?: Request): { ip?: string; userAgent?: string } {
  if (!req) return {}

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
  const userAgent = req.headers.get('user-agent')
  return {
    ...(ip ? { ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  }
}

/**
 * Helper para registrar login
 */
export async function logLogin(userId: string, tenantId: string, req?: Request) {
  const headers = getAuditHeaders(req)

  await logAudit({
    tenantId,
    actorId: userId,
    action: 'CREATE',
    entity: 'session',
    entityId: userId,
    diff: { action: 'login' },
    ...headers,
  })
}

/**
 * Helper para registrar logout
 */
export async function logLogout(
  userId: string,
  tenantId: string,
  req?: Request
) {
  const headers = getAuditHeaders(req)

  await logAudit({
    tenantId,
    actorId: userId,
    action: 'DELETE',
    entity: 'session',
    entityId: userId,
    diff: { action: 'logout' },
    ...headers,
  })
}

/**
 * Helper para registrar impersonación
 */
export async function logImpersonation(
  adminUserId: string,
  targetUserId: string,
  targetTenantId: string,
  req?: Request
) {
  const headers = getAuditHeaders(req)

  await logAudit({
    tenantId: null, // Root action
    actorId: adminUserId,
    action: 'IMPERSONATE',
    entity: 'user',
    entityId: targetUserId,
    diff: {
      targetTenantId,
      impersonatedUser: targetUserId,
    },
    ...headers,
  })
}

