/**
 * Server Actions para la vista móvil de ruta del repartidor.
 *
 * Las API routes (`/api/catering/rutas/*`, `/api/catering/entregas/*`)
 * siguen existiendo para que la app móvil y otros callers externos sigan
 * funcionando, pero la página `/catering/ruta/[id]` usa estas actions
 * directamente desde el cliente.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { getRequiredSession } from '@/lib/auth/session'
import { permittedAction } from '@/lib/auth/permissions'
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'
import {
  confirmDelivery,
  reportDeliveryIncident,
} from '@/lib/db/queries/catering-delivery'
import {
  completeRoute,
  createRoute,
  getRouteById,
  startRoute,
} from '@/lib/db/queries/catering-routes'
import {
  confirmDeliverySchema,
  createRouteSchema,
  reportIncidentSchema,
  type ConfirmDeliveryInput,
  type CreateRouteInput,
  type ReportIncidentInput,
} from '@/lib/validations/delivery'

const DELIVERY_ADMIN_ROLES = new Set(['ADMIN_CATERING', 'CHEF'])

// Roles legacy que pueden operar una ruta (admins + repartidor sobre la suya).
// Fallback para sesiones anteriores a la migración RBAC (sin permissions[]).
const ROUTE_OPERATOR_ROLES = [
  'ADMIN_CATERING',
  'CHEF',
  'REPARTIDOR',
] as const

/**
 * La capa de queries (`lib/db/queries/catering-*`) lanza `Error` planos con
 * mensajes de negocio aptos para el usuario ('La ruta ya está en curso…',
 * 'Aún hay pedidos sin entregar'…). Hasta que esa capa emita `DomainError`,
 * aquí se traducen los `Error` planos (constructor exacto `Error`, sin
 * `digest` de Next) para que `withAction` no los degrade al mensaje genérico.
 * Los errores de infraestructura (Prisma, TypeError…) son subclases y siguen
 * su camino hacia el mensaje genérico + log del servidor.
 */
async function fromQueries<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (
      error instanceof Error &&
      error.constructor === Error &&
      !('digest' in error)
    ) {
      throw new DomainError(error.message, 400)
    }
    throw error
  }
}

async function requireRouteAccess(routeId: string) {
  const session = await getRequiredSession()
  if (session.user.tenantType !== 'CATERING') {
    throw new DomainError('Tenant no autorizado', 403)
  }

  // REPARTIDOR sólo puede operar sobre su propia ruta
  if (session.user.role === 'REPARTIDOR') {
    const route = await getRouteById(session.user.tenantId, routeId)
    if (!route) {
      throw new DomainError('Ruta no encontrada', 404)
    }
    if (route.deliveryUser?.id !== session.user.id) {
      throw new DomainError('Acceso denegado', 403)
    }
  } else if (!DELIVERY_ADMIN_ROLES.has(session.user.role)) {
    throw new DomainError('Acceso denegado', 403)
  }

  return session
}

/**
 * Crear una ruta nueva (solo ADMIN_CATERING/CHEF)
 */
export async function createRouteAction(
  input: CreateRouteInput
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const session = await getRequiredSession()
    if (session.user.tenantType !== 'CATERING') {
      throw new DomainError('Tenant no autorizado', 403)
    }
    if (!DELIVERY_ADMIN_ROLES.has(session.user.role)) {
      throw new DomainError('Solo ADMIN_CATERING o CHEF pueden crear rutas', 403)
    }
    if (
      !permittedAction(session.user.permissions, session.user.role, 'route:create', [
        ...DELIVERY_ADMIN_ROLES,
      ])
    ) {
      throw new DomainError('No tienes permiso para crear rutas', 403)
    }

    const parsed = createRouteSchema.parse(input)
    const route = await fromQueries(() =>
      createRoute(session.user.tenantId, parsed)
    )
    revalidatePath('/catering/rutas')
    return { id: route.id }
  })
}

/**
 * Iniciar una ruta
 */
export async function startRouteAction(
  routeId: string
): Promise<ActionResult<void>> {
  return withAction(async () => {
    const session = await requireRouteAccess(routeId)
    if (
      !permittedAction(session.user.permissions, session.user.role, 'route:start', [
        ...ROUTE_OPERATOR_ROLES,
      ])
    ) {
      throw new DomainError('No tienes permiso para iniciar la ruta', 403)
    }
    await fromQueries(() => startRoute(session.user.tenantId, routeId))
    revalidatePath(`/catering/ruta/${routeId}`)
  })
}

/**
 * Completar una ruta
 */
export async function completeRouteAction(
  routeId: string,
  notes?: string
): Promise<ActionResult<void>> {
  return withAction(async () => {
    const session = await requireRouteAccess(routeId)
    if (
      !permittedAction(session.user.permissions, session.user.role, 'route:complete', [
        ...ROUTE_OPERATOR_ROLES,
      ])
    ) {
      throw new DomainError('No tienes permiso para completar la ruta', 403)
    }
    await fromQueries(() => completeRoute(session.user.tenantId, routeId, notes))
    revalidatePath(`/catering/ruta/${routeId}`)
  })
}

/**
 * Confirmar entrega de un pedido
 */
export async function confirmDeliveryAction(
  routeId: string,
  input: ConfirmDeliveryInput
): Promise<ActionResult<void>> {
  return withAction(async () => {
    const session = await requireRouteAccess(routeId)
    if (
      !permittedAction(
        session.user.permissions,
        session.user.role,
        'route:confirm-delivery',
        [...ROUTE_OPERATOR_ROLES]
      )
    ) {
      throw new DomainError('No tienes permiso para confirmar la entrega', 403)
    }
    const parsed = confirmDeliverySchema.parse(input)
    await fromQueries(() => confirmDelivery(session.user.tenantId, parsed))
    revalidatePath(`/catering/ruta/${routeId}`)
  })
}

/**
 * Reportar incidencia en una entrega
 */
export async function reportIncidentAction(
  routeId: string,
  input: ReportIncidentInput
): Promise<ActionResult<void>> {
  return withAction(async () => {
    const session = await requireRouteAccess(routeId)
    if (
      !permittedAction(
        session.user.permissions,
        session.user.role,
        'cat-incident:view',
        [...ROUTE_OPERATOR_ROLES]
      )
    ) {
      throw new DomainError('No tienes permiso para reportar incidencias', 403)
    }
    const parsed = reportIncidentSchema.parse(input)
    await fromQueries(() =>
      reportDeliveryIncident(session.user.tenantId, parsed, session.user.id)
    )
    revalidatePath(`/catering/ruta/${routeId}`)
  })
}
