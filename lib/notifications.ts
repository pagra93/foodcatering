/**
 * Notificaciones in-app (reutiliza el modelo `Notification`) + resolución de las
 * partes implicadas en un hilo de seguimiento (`ActivityMessage`).
 *
 * Una penalización involucra: equipo Plati (ROOT) + el catering.
 * Una incidencia involucra: ROOT + la empresa + el catering.
 */

import { prisma } from '@/lib/db/prisma'
import type {
  ActivityEntity,
  NotificationType,
  NotificationPriority,
} from '@prisma/client'
import { getRoleCategory } from '@/lib/auth/permissions'
import type { Session } from 'next-auth'

export async function createNotification(input: {
  tenantId: string
  userId?: string | null
  type: NotificationType
  priority?: NotificationPriority
  title: string
  message: string
  actionUrl?: string
}) {
  await prisma.notification.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      type: input.type,
      priority: input.priority ?? 'NORMAL',
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? null,
    },
  })
}

let rootTenantIdCache: string | null = null
async function getRootTenantId(): Promise<string | null> {
  if (rootTenantIdCache) return rootTenantIdCache
  const t = await prisma.tenant.findFirst({
    where: { type: 'ROOT' },
    select: { id: true },
  })
  rootTenantIdCache = t?.id ?? null
  return rootTenantIdCache
}

type Party = { tenantId: string; portal: 'admin' | 'catering' | 'empresa' }

/** Partes implicadas (tenants) de una entidad, con su portal. null si no existe. */
export async function getEntityParties(
  entity: ActivityEntity,
  entityId: string
): Promise<Party[] | null> {
  const rootId = await getRootTenantId()
  const parties: Party[] = []
  if (rootId) parties.push({ tenantId: rootId, portal: 'admin' })

  if (entity === 'PENALTY') {
    const p = await prisma.penalty.findUnique({
      where: { id: entityId },
      select: { tenantCatering: true },
    })
    if (!p) return null
    parties.push({ tenantId: p.tenantCatering, portal: 'catering' })
  } else {
    const i = await prisma.incident.findUnique({
      where: { id: entityId },
      select: { tenantEmpresa: true, tenantCatering: true },
    })
    if (!i) return null
    parties.push({ tenantId: i.tenantCatering, portal: 'catering' })
    parties.push({ tenantId: i.tenantEmpresa, portal: 'empresa' })
  }
  return parties
}

/** URL de destino de la notificación según el portal del destinatario. */
function actionUrlFor(
  portal: Party['portal'],
  entity: ActivityEntity,
  entityId: string
): string {
  if (entity === 'PENALTY') {
    return portal === 'admin' ? `/admin/quality/penalties/${entityId}` : '/catering/calidad'
  }
  // INCIDENT
  if (portal === 'admin') return `/admin/quality/incidents/${entityId}`
  if (portal === 'empresa') return `/empresa/incidencias/${entityId}`
  return '/catering/incidencias'
}

/**
 * Notifica a todas las partes implicadas de una entidad EXCEPTO la del autor.
 * Se usa al aplicar/disputar/resolver o al publicar un mensaje.
 */
export async function notifyEntityParties(
  entity: ActivityEntity,
  entityId: string,
  opts: { excludeTenantId?: string; title: string; message: string; priority?: NotificationPriority }
) {
  const parties = await getEntityParties(entity, entityId)
  if (!parties) return
  const type: NotificationType = entity === 'INCIDENT' ? 'INCIDENT' : 'ALERT'
  const seen = new Set<string>()
  for (const p of parties) {
    if (p.tenantId === opts.excludeTenantId) continue
    if (seen.has(p.tenantId)) continue
    seen.add(p.tenantId)
    await createNotification({
      tenantId: p.tenantId,
      type,
      priority: opts.priority,
      title: opts.title,
      message: opts.message,
      actionUrl: actionUrlFor(p.portal, entity, entityId),
    })
  }
}

/** ¿Puede el usuario ver/participar en el hilo de esta entidad? */
export async function canAccessEntity(
  session: Session,
  entity: ActivityEntity,
  entityId: string
): Promise<{ allowed: boolean; canSeeInternal: boolean }> {
  const isRoot = getRoleCategory(session.user.role) === 'ROOT'
  if (isRoot) return { allowed: true, canSeeInternal: true }

  const parties = await getEntityParties(entity, entityId)
  if (!parties) return { allowed: false, canSeeInternal: false }
  const myTenant = session.user.tenantId
  const allowed = parties.some((p) => p.portal !== 'admin' && p.tenantId === myTenant)
  return { allowed, canSeeInternal: false }
}
