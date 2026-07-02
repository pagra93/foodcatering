/**
 * Feedback de incidencias: notificación in-app a las partes + traza en el hilo
 * de seguimiento (`ActivityMessage`) cuando cambia el estado o se crea una.
 *
 * Reutiliza `notifyEntityParties` (lib/notifications) y el hilo compartido
 * (`ActivityThread` / getThreadMessages). El triángulo de una incidencia es:
 * empleado/empresa (reporta) ↔ catering (resuelve) ↔ Plati/admin (supervisa).
 */

import { prisma } from '@/lib/db/prisma'
import type { UserRole } from '@prisma/client'
import { notifyEntityParties } from '@/lib/notifications'
import { incidentDisplayName, STATUS_META } from '@/lib/incidents/constants'

/** Rol del actor para autorar el mensaje de sistema en el hilo. */
async function authorRoleFor(userId: string): Promise<UserRole | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return u?.role ?? null
}

/** Nombre legible de la incidencia (asunto > motivo > tipo). */
async function displayNameFor(incidentId: string): Promise<string> {
  const i = await prisma.incident.findUnique({
    where: { id: incidentId },
    select: { type: true, subject: true, reason: { select: { name: true } } },
  })
  if (!i) return 'Incidencia'
  return incidentDisplayName({
    subject: i.subject,
    reasonName: i.reason?.name ?? null,
    type: i.type,
  })
}

/**
 * Notifica a las partes de que se ha creado una incidencia (avisa al catering y
 * a Plati; excluye al tenant que la reporta).
 */
export async function notifyIncidentCreated(
  incidentId: string,
  reporterTenantId: string
) {
  const name = await displayNameFor(incidentId)
  await notifyEntityParties('INCIDENT', incidentId, {
    excludeTenantId: reporterTenantId,
    title: 'Nueva incidencia',
    message: `Se ha reportado una incidencia: ${name}`,
    priority: 'HIGH',
  })
}

/**
 * Registra un cambio de estado: deja constancia en el hilo (mensaje del actor)
 * y notifica a la otra parte + Plati (excluye al tenant del actor).
 */
export async function notifyIncidentStatusChange(input: {
  incidentId: string
  actorUserId: string
  actorTenantId: string
  status: 'IN_PROGRESS' | 'RESOLVED' | 'COMPENSATED'
  note?: string | null
}) {
  const { incidentId, actorUserId, actorTenantId, status, note } = input
  const statusLabel = STATUS_META[status].label
  const name = await displayNameFor(incidentId)

  // Traza en el hilo (autorada por el actor, visible para todas las partes).
  const role = await authorRoleFor(actorUserId)
  if (role) {
    const body = note?.trim()
      ? `Marcó la incidencia como «${statusLabel}»: ${note.trim()}`
      : `Marcó la incidencia como «${statusLabel}»`
    await prisma.activityMessage.create({
      data: {
        entity: 'INCIDENT',
        entityId: incidentId,
        authorId: actorUserId,
        authorTenant: actorTenantId,
        authorRole: role,
        body,
        isInternal: false,
      },
    })
  }

  // Notificación a la otra parte + Plati.
  await notifyEntityParties('INCIDENT', incidentId, {
    excludeTenantId: actorTenantId,
    title: `Incidencia «${statusLabel}»`,
    message: `${name} — ahora está «${statusLabel}»`,
    priority: status === 'RESOLVED' || status === 'COMPENSATED' ? 'NORMAL' : 'HIGH',
  })
}
