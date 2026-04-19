/**
 * Queries para gestión de Incidencias en Portal Empresa
 * ♻️ REUTILIZA estructura del portal de Admin adaptada para empresa
 */

import { prisma } from '@/lib/db/prisma'
import { startOfMonth } from 'date-fns'
import type { IncidentSeverity } from '@prisma/client'

// ♻️ REUTILIZAR mapeo de tipos (mismo que en admin)
export const INCIDENT_TYPES: Record<string, { label: string; color: string }> = {
  DELAYED_DELIVERY: { label: '⏰ Entrega Retrasada', color: 'bg-yellow-100 text-yellow-800' },
  MISSING_ITEM: { label: '📦 Producto Faltante', color: 'bg-orange-100 text-orange-800' },
  WRONG_ORDER: { label: '❌ Pedido Incorrecto', color: 'bg-blue-100 text-blue-800' },
  QUALITY_ISSUE: { label: '⚠️ Problema de Calidad', color: 'bg-red-100 text-red-800' },
  ALLERGEN_ISSUE: { label: '🚨 Alérgeno No Declarado', color: 'bg-red-100 text-red-800' },
  DAMAGED_PACKAGING: { label: '📦 Empaquetado Dañado', color: 'bg-gray-100 text-gray-800' },
  OTHER: { label: '❓ Otro', color: 'bg-gray-100 text-gray-800' },
}

// ♻️ REUTILIZAR mapeo de severidad
export const SEVERITY_MAP = {
  LOW: { label: 'Baja', variant: 'outline' as const, color: 'bg-gray-100' },
  MEDIUM: { label: 'Media', variant: 'default' as const, color: 'bg-yellow-100' },
  HIGH: { label: 'Alta', variant: 'destructive' as const, color: 'bg-red-100' },
}

// ♻️ REUTILIZAR mapeo de estados
export const INCIDENT_STATUS_MAP = {
  OPEN: { label: 'Abierta', variant: 'destructive' as const },
  IN_PROGRESS: { label: 'En Progreso', variant: 'default' as const },
  RESOLVED: { label: 'Resuelta', variant: 'success' as const },
  CLOSED: { label: 'Cerrada', variant: 'outline' as const },
}

// ============================================================================
// OBTENER KPIs DE INCIDENCIAS
// ============================================================================

export async function getIncidentsKPIs(tenantId: string) {
  const [open, inProgress, resolved, all] = await Promise.all([
    // Incidencias abiertas
    prisma.incident.count({
      where: {
        tenantEmpresa: tenantId,
        status: 'OPEN',
      },
    }),

    // En progreso
    prisma.incident.count({
      where: {
        tenantEmpresa: tenantId,
        status: 'IN_PROGRESS',
      },
    }),

    // Resueltas
    prisma.incident.count({
      where: {
        tenantEmpresa: tenantId,
        status: 'RESOLVED',
      },
    }),

    // Todas (para calcular tiempo medio)
    prisma.incident.findMany({
      where: {
        tenantEmpresa: tenantId,
        status: 'RESOLVED',
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
        resolution: true,
      },
      orderBy: { resolvedAt: 'desc' },
      take: 50,
    }),
  ])

  // Calcular tiempo medio de resolución (en minutos)
  const avgResolutionTime =
    all.length > 0
      ? all.reduce((sum, inc) => {
          if (inc.resolvedAt) {
            const diff =
              (inc.resolvedAt.getTime() - inc.createdAt.getTime()) / 1000 / 60
            return sum + diff
          }
          return sum
        }, 0) / all.length
      : 0

  // Calcular compensaciones totales (extraer de resolution JSON)
  const totalCompensations = all.reduce((sum, inc) => {
    if (inc.resolution && typeof inc.resolution === 'object') {
      const resolution = inc.resolution as any
      return sum + (resolution.amount ? Number(resolution.amount) : 0)
    }
    return sum
  }, 0)

  return {
    open,
    inProgress,
    resolved,
    avgResolutionTime: Math.round(avgResolutionTime),
    totalCompensations,
  }
}

// ============================================================================
// OBTENER LISTADO DE INCIDENCIAS CON FILTROS
// ============================================================================

export type IncidentFilters = {
  type?: string
  severity?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export async function getIncidents(tenantId: string, filters: IncidentFilters = {}) {
  const {
    type,
    severity,
    status,
    search,
    page = 1,
    limit = 20,
  } = filters

  const where: any = {
    tenantEmpresa: tenantId,
  }

  // Filtros
  if (type && type !== 'all') where.type = type
  if (severity && severity !== 'all') where.severity = severity
  if (status && status !== 'all') where.status = status

  // Búsqueda
  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { reportedBy: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        openedBy: true,
        assignedTo: true,
        resolution: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        order: {
          select: {
            id: true,
            serviceDate: true,
            employeeId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.incident.count({ where }),
  ])

  // Calcular tiempo de resolución para cada incidencia
  const incidentsWithTime = incidents.map((inc) => {
    const resolutionTime = inc.resolvedAt
      ? Math.round(
          (inc.resolvedAt.getTime() - inc.createdAt.getTime()) / 1000 / 60
        )
      : null

    // Extraer compensation de resolution JSON si existe
    let compensation = null
    if (inc.resolution && typeof inc.resolution === 'object') {
      const resolution = inc.resolution as any
      compensation = resolution.amount ? Number(resolution.amount) : null
    }

    return {
      ...inc,
      resolutionTime,
      compensation,
    }
  })

  return {
    incidents: incidentsWithTime,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// ============================================================================
// OBTENER DETALLE DE INCIDENCIA
// ============================================================================

export async function getIncidentById(tenantId: string, incidentId: string) {
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      tenantEmpresa: tenantId,
    },
    include: {
      order: true,
    },
  })

  if (!incident) {
    throw new Error('Incidencia no encontrada')
  }

  // Order no tiene relación directa a Employee; traemos empleado por separado si hay orden
  const employee = incident.order
    ? await prisma.employee.findUnique({
        where: { id: incident.order.employeeId },
        include: { user: { select: { nameEnc: true, email: true } } },
      })
    : null

  // Calcular tiempo de resolución
  const resolutionTime = incident.resolvedAt
    ? Math.round(
        (incident.resolvedAt.getTime() - incident.createdAt.getTime()) /
          1000 /
          60
      )
    : null

  // Extraer compensation de resolution JSON si existe
  let compensation = null
  if (incident.resolution && typeof incident.resolution === 'object') {
    const resolution = incident.resolution as any
    compensation = resolution.amount ? Number(resolution.amount) : null
  }

  return {
    ...incident,
    employee,
    resolutionTime,
    compensation,
  }
}

// ============================================================================
// CREAR NUEVA INCIDENCIA
// ============================================================================

export type CreateIncidentInput = {
  orderId: string
  type: string
  severity: string
  openedBy: string
}

export async function createIncident(
  tenantId: string,
  data: CreateIncidentInput
) {
  // Verificar que el pedido pertenece a la empresa
  const order = await prisma.order.findFirst({
    where: {
      id: data.orderId,
      tenantEmpresa: tenantId,
    },
  })

  if (!order) {
    throw new Error('Pedido no encontrado')
  }

  const incident = await prisma.incident.create({
    data: {
      orderId: data.orderId,
      tenantEmpresa: tenantId,
      tenantCatering: order.tenantCatering,
      type: data.type,
      severity: data.severity as IncidentSeverity,
      status: 'OPEN',
      openedBy: data.openedBy,
    },
  })

  return incident
}

// ============================================================================
// RESOLVER INCIDENCIA
// ============================================================================

export type ResolveIncidentInput = {
  resolutionDetails: string
  compensationAmount?: number
}

export async function resolveIncident(
  tenantId: string,
  incidentId: string,
  userId: string,
  data: ResolveIncidentInput
) {
  // Verificar que la incidencia pertenece a la empresa
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      tenantEmpresa: tenantId,
    },
  })

  if (!incident) {
    throw new Error('Incidencia no encontrada')
  }

  // Crear objeto resolution con estructura correcta
  const resolution = {
    details: data.resolutionDetails,
    amount: data.compensationAmount || null,
    resolvedBy: userId,
    resolvedAt: new Date().toISOString(),
  }

  const updated = await prisma.incident.update({
    where: { id: incidentId },
    data: {
      status: data.compensationAmount ? 'COMPENSATED' : 'RESOLVED',
      resolution,
      resolvedAt: new Date(),
      assignedTo: userId,
    },
  })

  return updated
}

// ============================================================================
// ESTADÍSTICAS POR TIPO
// ============================================================================

export async function getIncidentsByType(tenantId: string) {
  const thisMonth = startOfMonth(new Date())

  const incidents = await prisma.incident.groupBy({
    by: ['type'],
    where: {
      tenantEmpresa: tenantId,
      createdAt: { gte: thisMonth },
    },
    _count: true,
  })

  return incidents.map((item) => ({
    type: item.type,
    count: item._count,
    label: INCIDENT_TYPES[item.type]?.label || item.type,
  }))
}

