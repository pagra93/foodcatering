/**
 * Queries para Incidencias del Empleado
 * El empleado puede ver sus incidencias y reportar nuevas
 */

import { prisma } from '@/lib/db/prisma'
import { notifyIncidentCreated } from '@/lib/incidents/notify'
import { incidentTypeLabel } from '@/lib/incidents/constants'

// ============================================================================
// MAPEO DE TIPOS Y ESTADOS
// ============================================================================

import {
  INCIDENT_TYPES,
  SEVERITY_MAP,
  INCIDENT_STATUS_MAP,
} from '@/lib/incidents/empleado-ui'
export { INCIDENT_TYPES, SEVERITY_MAP, INCIDENT_STATUS_MAP }

// ============================================================================
// OBTENER INCIDENCIAS DEL EMPLEADO
// ============================================================================

export async function getEmployeeIncidents(employeeId: string) {
  // Tenant del empleado (findUnique por id → exento del guard) para acotar las
  // lecturas de pedidos/incidencias a su empresa (defensa en profundidad, F5).
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { tenantId: true },
  })
  if (!employee) return []

  // Obtener todos los pedidos del empleado
  const orders = await prisma.order.findMany({
    where: {
      tenantEmpresa: employee.tenantId,
      employeeId,
    },
    select: {
      id: true,
    },
  })

  const orderIds = orders.map((o) => o.id)

  // Obtener incidencias asociadas a esos pedidos
  const incidents = await prisma.incident.findMany({
    where: {
      tenantEmpresa: employee.tenantId,
      orderId: {
        in: orderIds,
      },
    },
    select: {
      id: true,
      type: true,
      subject: true,
      severity: true,
      status: true,
      openedBy: true,
      resolution: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      reason: { select: { name: true } },
      order: {
        select: {
          id: true,
          serviceDate: true,
          selection: true,
          price: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return incidents.map((incident) => ({
    ...incident,
    reasonName: incident.reason?.name ?? null,
    typeLabel: incidentTypeLabel(incident.type),
    typeIcon: INCIDENT_TYPES[incident.type]?.icon || '❓',
    severityLabel: SEVERITY_MAP[incident.severity]?.label || incident.severity,
    statusLabel: INCIDENT_STATUS_MAP[incident.status]?.label || incident.status,
    resolutionTime: incident.resolvedAt
      ? Math.round((incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 1000 / 60)
      : null,
  }))
}

// ============================================================================
// OBTENER DETALLE DE INCIDENCIA
// ============================================================================

export async function getIncidentDetail(incidentId: string, employeeId: string) {
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      order: {
        employeeId,
      },
    },
    include: {
      reason: { select: { name: true } },
      order: {
        select: {
          id: true,
          serviceDate: true,
          selection: true,
          price: true,
          status: true,
        },
      },
    },
  })

  if (!incident) {
    throw new Error('Incidencia no encontrada')
  }

  return {
    ...incident,
    reasonName: incident.reason?.name ?? null,
    typeLabel: incidentTypeLabel(incident.type),
    typeDescription: INCIDENT_TYPES[incident.type]?.description || '',
    typeIcon: INCIDENT_TYPES[incident.type]?.icon || '❓',
    severityLabel: SEVERITY_MAP[incident.severity]?.label || incident.severity,
    statusLabel: INCIDENT_STATUS_MAP[incident.status]?.label || incident.status,
    resolutionTime: incident.resolvedAt
      ? Math.round((incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 1000 / 60)
      : null,
  }
}

// ============================================================================
// CREAR NUEVA INCIDENCIA (EMPLEADO)
// ============================================================================

export type CreateIncidentInput = {
  orderId: string
  reasonId?: string
  type?: string
  severity?: 'LOW' | 'MEDIUM' | 'HIGH'
  subject?: string
}

export async function createIncident(
  employeeId: string,
  userId: string,
  data: CreateIncidentInput
) {
  // Verificar que el pedido pertenece al empleado
  const order = await prisma.order.findFirst({
    where: {
      id: data.orderId,
      employeeId,
    },
  })

  if (!order) {
    throw new Error('Pedido no encontrado')
  }

  // Motivo del catálogo (fuente preferida): fija type (código) y severidad por defecto.
  let type = data.type
  let severity = data.severity
  if (data.reasonId) {
    const reason = await prisma.incidentReason.findUnique({
      where: { id: data.reasonId },
      select: { code: true, defaultSeverity: true },
    })
    if (!reason) throw new Error('Motivo no encontrado')
    type = reason.code
    severity = severity ?? reason.defaultSeverity
  }
  if (!type) throw new Error('Falta el motivo de la incidencia')

  const incident = await prisma.incident.create({
    data: {
      orderId: data.orderId,
      tenantEmpresa: order.tenantEmpresa,
      tenantCatering: order.tenantCatering,
      type,
      reasonId: data.reasonId ?? null,
      subject: data.subject?.trim() || null,
      severity: severity ?? 'MEDIUM',
      status: 'OPEN',
      openedBy: userId,
    },
  })

  // Feedback: avisa al catering + Plati (excluye a la empresa que reporta).
  try {
    await notifyIncidentCreated(incident.id, order.tenantEmpresa)
  } catch (err) {
    console.error('[incident] notifyIncidentCreated fallo', err)
  }

  return incident
}

// ============================================================================
// ESTADÍSTICAS DE INCIDENCIAS DEL EMPLEADO
// ============================================================================

export async function getEmployeeIncidentStats(employeeId: string) {
  // Tenant del empleado (findUnique por id → exento) para acotar por empresa (F5).
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { tenantId: true },
  })
  if (!employee) return { total: 0, open: 0, resolved: 0 }

  // Obtener todos los pedidos del empleado
  const orders = await prisma.order.findMany({
    where: {
      tenantEmpresa: employee.tenantId,
      employeeId,
    },
    select: {
      id: true,
    },
  })

  const orderIds = orders.map((o) => o.id)

  const [total, open, resolved] = await Promise.all([
    prisma.incident.count({
      where: {
        tenantEmpresa: employee.tenantId,
        orderId: {
          in: orderIds,
        },
      },
    }),
    prisma.incident.count({
      where: {
        tenantEmpresa: employee.tenantId,
        orderId: {
          in: orderIds,
        },
        status: 'OPEN',
      },
    }),
    prisma.incident.count({
      where: {
        tenantEmpresa: employee.tenantId,
        orderId: {
          in: orderIds,
        },
        status: {
          in: ['RESOLVED', 'COMPENSATED'],
        },
      },
    }),
  ])

  return {
    total,
    open,
    resolved,
  }
}

