/**
 * Queries para Registro de Actividad en Portal Empresa
 * ♻️ REUTILIZA tabla AuditLog ya existente
 */

import { prisma } from '@/lib/db/prisma'

// ♻️ REUTILIZAR mapeo de acciones (mismo que en admin)
export const ACTION_TYPES = {
  CREATE: { label: 'Creó', color: 'bg-green-100 text-green-800' },
  UPDATE: { label: 'Modificó', color: 'bg-blue-100 text-blue-800' },
  DELETE: { label: 'Eliminó', color: 'bg-red-100 text-red-800' },
  LOGIN: { label: 'Inició sesión', color: 'bg-gray-100 text-gray-800' },
  LOGOUT: { label: 'Cerró sesión', color: 'bg-gray-100 text-gray-800' },
  EXPORT: { label: 'Exportó', color: 'bg-purple-100 text-purple-800' },
  IMPORT: { label: 'Importó', color: 'bg-purple-100 text-purple-800' },
}

// ♻️ REUTILIZAR mapeo de recursos
export const RESOURCE_TYPES = {
  EMPLOYEE: { label: 'Empleado', icon: '👤' },
  ORDER: { label: 'Pedido', icon: '🍽️' },
  INCIDENT: { label: 'Incidencia', icon: '⚠️' },
  COMPANY: { label: 'Empresa', icon: '🏢' },
  POLICY: { label: 'Política', icon: '📋' },
  SITE: { label: 'Sede', icon: '📍' },
  INVOICE: { label: 'Factura', icon: '💰' },
  REPORT: { label: 'Reporte', icon: '📊' },
}

// ============================================================================
// OBTENER REGISTRO DE ACTIVIDAD
// ============================================================================

export type ActivityFilters = {
  action?: string
  resourceType?: string
  userId?: string
  search?: string
  page?: number
  limit?: number
}

export async function getActivityLog(
  tenantId: string,
  filters: ActivityFilters = {}
) {
  const { action, resourceType, userId, search, page = 1, limit = 50 } = filters

  const where: any = {
    tenantId,
  }

  // Filtros
  if (action && action !== 'all') where.action = action
  if (resourceType && resourceType !== 'all') where.resourceType = resourceType
  if (userId && userId !== 'all') where.userId = userId

  // Búsqueda
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { resourceType: { contains: search, mode: 'insensitive' } },
      { resourceId: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        userId: true,
        action: true,
        resourceType: true,
        resourceId: true,
        prevState: true,
        newState: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.auditLog.count({ where }),
  ])

  // Obtener nombres de usuarios
  const userIds = [...new Set(logs.map((l) => l.userId))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      nameEnc: true,
      email: true,
    },
  })

  const userMap = new Map(users.map((u) => [u.id, u]))

  const logsWithUsers = logs.map((log) => ({
    ...log,
    user: userMap.get(log.userId),
  }))

  return {
    logs: logsWithUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// ============================================================================
// OBTENER ESTADÍSTICAS DE ACTIVIDAD
// ============================================================================

export async function getActivityStats(tenantId: string) {
  const last30Days = new Date()
  last30Days.setDate(last30Days.getDate() - 30)

  const [totalActions, actionsByType, actionsByUser] = await Promise.all([
    // Total de acciones
    prisma.auditLog.count({
      where: {
        tenantId,
        createdAt: { gte: last30Days },
      },
    }),

    // Por tipo de acción
    prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        tenantId,
        createdAt: { gte: last30Days },
      },
      _count: true,
    }),

    // Por usuario
    prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        tenantId,
        createdAt: { gte: last30Days },
      },
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: 5,
    }),
  ])

  return {
    totalActions,
    actionsByType: actionsByType.map((item) => ({
      action: item.action,
      count: item._count,
      label: ACTION_TYPES[item.action as keyof typeof ACTION_TYPES]?.label || item.action,
    })),
    topUsers: actionsByUser.map((item) => ({
      userId: item.userId,
      count: item._count,
    })),
  }
}

