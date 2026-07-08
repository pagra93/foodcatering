/**
 * Queries para Incidencias del Catering
 * El catering puede ver y responder incidencias de sus clientes
 */

import { prisma } from '@/lib/db/prisma'
import { notifyIncidentStatusChange } from '@/lib/incidents/notify'
import { incidentTypeLabel } from '@/lib/incidents/constants'

// ============================================================================
// MAPEO DE TIPOS Y ESTADOS
// ============================================================================

import {
  INCIDENT_TYPES,
  SEVERITY_MAP,
  INCIDENT_STATUS_MAP,
} from '@/lib/incidents/catering-ui'
export { INCIDENT_TYPES, SEVERITY_MAP, INCIDENT_STATUS_MAP }

// ============================================================================
// OBTENER ESTADÍSTICAS DE INCIDENCIAS
// ============================================================================

export async function getCateringIncidentStats(tenantId: string) {
  const [total, open, inProgress, resolved] = await Promise.all([
    prisma.incident.count({
      where: {
        tenantCatering: tenantId,
      },
    }),
    prisma.incident.count({
      where: {
        tenantCatering: tenantId,
        status: 'OPEN',
      },
    }),
    prisma.incident.count({
      where: {
        tenantCatering: tenantId,
        status: 'IN_PROGRESS',
      },
    }),
    prisma.incident.count({
      where: {
        tenantCatering: tenantId,
        status: {
          in: ['RESOLVED', 'COMPENSATED'],
        },
      },
    }),
  ])

  // Calcular tiempo medio de resolución (últimas 50 resueltas)
  const resolvedIncidents = await prisma.incident.findMany({
    where: {
      tenantCatering: tenantId,
      status: {
        in: ['RESOLVED', 'COMPENSATED'],
      },
      resolvedAt: { not: null },
    },
    select: {
      createdAt: true,
      resolvedAt: true,
    },
    orderBy: { resolvedAt: 'desc' },
    take: 50,
  })

  const avgResolutionTime =
    resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, inc) => {
          if (inc.resolvedAt) {
            const diff = (inc.resolvedAt.getTime() - inc.createdAt.getTime()) / 1000 / 60
            return sum + diff
          }
          return sum
        }, 0) / resolvedIncidents.length
      : 0

  return {
    total,
    open,
    inProgress,
    resolved,
    avgResolutionTime: Math.round(avgResolutionTime),
  }
}

// ============================================================================
// OBTENER INCIDENCIAS CON FILTROS
// ============================================================================

export type IncidentFilters = {
  status?: string
  type?: string
  severity?: string
  companyId?: string
}

export async function getCateringIncidents(
  tenantId: string,
  filters: IncidentFilters = {}
) {
  const where: any = {
    tenantCatering: tenantId,
  }

  if (filters.status && filters.status !== 'all') {
    where.status = filters.status
  }

  if (filters.type && filters.type !== 'all') {
    where.type = filters.type
  }

  if (filters.severity && filters.severity !== 'all') {
    where.severity = filters.severity
  }

  if (filters.companyId) {
    where.tenantEmpresa = filters.companyId
  }

  const incidents = await prisma.incident.findMany({
    where,
    select: {
      id: true,
      type: true,
      subject: true,
      severity: true,
      status: true,
      openedBy: true,
      assignedTo: true,
      resolution: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      tenantEmpresa: true,
      reason: { select: { name: true } },
      order: {
        select: {
          id: true,
          serviceDate: true,
          selection: true,
          price: true,
          employeeId: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' }, // OPEN primero, luego IN_PROGRESS, etc
      { createdAt: 'desc' },
    ],
    take: 100, // Limitar a 100 para performance
  })

  // Obtener información de las empresas (para mostrar nombre)
  const companyIds = [...new Set(incidents.map((i) => i.tenantEmpresa))]
  const companies = await prisma.tenant.findMany({
    where: {
      id: {
        in: companyIds,
      },
    },
    select: {
      id: true,
      name: true,
    },
  })

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.name]))

  // Obtener información de empleados (para mostrar nombre)
  const employeeIds = incidents
    .map((i) => i.order?.employeeId)
    .filter((id): id is string => id !== null && id !== undefined)

  const employees = await prisma.employee.findMany({
    where: {
      id: {
        in: employeeIds,
      },
    },
    select: {
      id: true,
      user: {
        select: {
          nameEnc: true,
          email: true,
        },
      },
    },
  })

  const employeeMap = Object.fromEntries(
    employees.map((e) => [
      e.id,
      {
        name: e.user.nameEnc,
        email: e.user.email,
      },
    ])
  )

  return incidents.map((incident) => ({
    ...incident,
    reasonName: incident.reason?.name ?? null,
    companyName: companyMap[incident.tenantEmpresa] || 'Empresa desconocida',
    employeeName:
      incident.order?.employeeId
        ? employeeMap[incident.order.employeeId]?.name || 'Empleado desconocido'
        : null,
    employeeEmail:
      incident.order?.employeeId
        ? employeeMap[incident.order.employeeId]?.email || null
        : null,
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

export async function getIncidentDetail(incidentId: string, tenantId: string) {
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      tenantCatering: tenantId,
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
          employeeId: true,
        },
      },
    },
  })

  if (!incident) {
    throw new Error('Incidencia no encontrada')
  }

  // Obtener info del empleado
  let employeeInfo = null
  if (incident.order?.employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: incident.order.employeeId },
      select: {
        user: {
          select: {
            nameEnc: true,
            email: true,
          },
        },
      },
    })
    if (employee) {
      employeeInfo = {
        name: employee.user.nameEnc,
        email: employee.user.email,
      }
    }
  }

  // Obtener info de la empresa
  const company = await prisma.tenant.findUnique({
    where: { id: incident.tenantEmpresa },
    select: {
      name: true,
    },
  })

  return {
    ...incident,
    reasonName: incident.reason?.name ?? null,
    companyName: company?.name || 'Empresa desconocida',
    employeeName: employeeInfo?.name || 'Empleado desconocido',
    employeeEmail: employeeInfo?.email || null,
    typeLabel: incidentTypeLabel(incident.type),
    typeIcon: INCIDENT_TYPES[incident.type]?.icon || '❓',
    severityLabel: SEVERITY_MAP[incident.severity]?.label || incident.severity,
    statusLabel: INCIDENT_STATUS_MAP[incident.status]?.label || incident.status,
    resolutionTime: incident.resolvedAt
      ? Math.round((incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 1000 / 60)
      : null,
  }
}

// ============================================================================
// ACTUALIZAR ESTADO DE INCIDENCIA
// ============================================================================

export async function updateIncidentStatus(
  incidentId: string,
  tenantId: string,
  status: 'IN_PROGRESS' | 'RESOLVED' | 'COMPENSATED',
  userId: string
) {
  // Verificar que la incidencia pertenece al catering
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      tenantCatering: tenantId,
    },
  })

  if (!incident) {
    throw new Error('Incidencia no encontrada')
  }

  const updated = await prisma.incident.update({
    where: { id: incidentId },
    data: {
      status,
      assignedTo: userId,
      resolvedAt: status === 'RESOLVED' || status === 'COMPENSATED' ? new Date() : undefined,
      updatedAt: new Date(),
    },
  })

  // Feedback: traza en el hilo + notificación a empresa/Plati (no bloqueante).
  try {
    await notifyIncidentStatusChange({
      incidentId,
      actorUserId: userId,
      actorTenantId: tenantId,
      status,
    })
  } catch (err) {
    console.error('[incident] notifyIncidentStatusChange fallo', err)
  }

  return updated
}

// ============================================================================
// AÑADIR RESOLUCIÓN A INCIDENCIA
// ============================================================================

export type ResolveIncidentInput = {
  resolutionType: string
  resolutionDetails: string
  compensationAmount?: number
}

export async function resolveIncident(
  incidentId: string,
  tenantId: string,
  userId: string,
  data: ResolveIncidentInput
) {
  // Verificar que la incidencia pertenece al catering
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      tenantCatering: tenantId,
    },
  })

  if (!incident) {
    throw new Error('Incidencia no encontrada')
  }

  const resolution = {
    type: data.resolutionType,
    details: data.resolutionDetails,
    amount: data.compensationAmount || null,
    resolvedBy: userId,
    resolvedAt: new Date(),
  }

  const nextStatus = data.compensationAmount ? 'COMPENSATED' : 'RESOLVED'
  const updated = await prisma.incident.update({
    where: { id: incidentId },
    data: {
      status: nextStatus,
      resolution,
      assignedTo: userId,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    },
  })

  // Feedback: traza en el hilo + notificación a empresa/Plati (no bloqueante).
  try {
    await notifyIncidentStatusChange({
      incidentId,
      actorUserId: userId,
      actorTenantId: tenantId,
      status: nextStatus,
      note: data.resolutionDetails,
    })
  } catch (err) {
    console.error('[incident] notifyIncidentStatusChange fallo', err)
  }

  return updated
}

