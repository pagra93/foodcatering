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
import { ZodError } from 'zod'
import { getRequiredSession } from '@/lib/auth/session'
import {
  confirmDelivery,
  reportDeliveryIncident,
} from '@/lib/db/queries/catering-delivery'
import {
  completeRoute,
  getRouteById,
  startRoute,
} from '@/lib/db/queries/catering-routes'
import {
  confirmDeliverySchema,
  reportIncidentSchema,
  type ConfirmDeliveryInput,
  type ReportIncidentInput,
} from '@/lib/validations/delivery'

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

const DELIVERY_ADMIN_ROLES = new Set(['ADMIN_CATERING', 'CHEF'])

async function requireRouteAccess(routeId: string) {
  const session = await getRequiredSession()
  if (session.user.tenantType !== 'CATERING') {
    throw new Error('Tenant no autorizado')
  }

  // REPARTIDOR sólo puede operar sobre su propia ruta
  if (session.user.role === 'REPARTIDOR') {
    const route = await getRouteById(session.user.tenantId, routeId)
    if (!route) {
      throw new Error('Ruta no encontrada')
    }
    if (route.deliveryUser?.id !== session.user.id) {
      throw new Error('Acceso denegado')
    }
  } else if (!DELIVERY_ADMIN_ROLES.has(session.user.role)) {
    throw new Error('Acceso denegado')
  }

  return session
}

function formatZodError(error: ZodError): string {
  const first = error.errors[0]
  return first ? first.message : 'Datos inválidos'
}

/**
 * Iniciar una ruta
 */
export async function startRouteAction(
  routeId: string
): Promise<ActionResult> {
  try {
    const session = await requireRouteAccess(routeId)
    await startRoute(session.user.tenantId, routeId)
    revalidatePath(`/catering/ruta/${routeId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Error al iniciar la ruta' }
  }
}

/**
 * Completar una ruta
 */
export async function completeRouteAction(
  routeId: string,
  notes?: string
): Promise<ActionResult> {
  try {
    const session = await requireRouteAccess(routeId)
    await completeRoute(session.user.tenantId, routeId, notes)
    revalidatePath(`/catering/ruta/${routeId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Error al completar la ruta' }
  }
}

/**
 * Confirmar entrega de un pedido
 */
export async function confirmDeliveryAction(
  routeId: string,
  input: ConfirmDeliveryInput
): Promise<ActionResult> {
  try {
    const session = await requireRouteAccess(routeId)
    const parsed = confirmDeliverySchema.parse(input)
    await confirmDelivery(session.user.tenantId, parsed)
    revalidatePath(`/catering/ruta/${routeId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: formatZodError(error) }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Error al confirmar la entrega' }
  }
}

/**
 * Reportar incidencia en una entrega
 */
export async function reportIncidentAction(
  routeId: string,
  input: ReportIncidentInput
): Promise<ActionResult> {
  try {
    const session = await requireRouteAccess(routeId)
    const parsed = reportIncidentSchema.parse(input)
    await reportDeliveryIncident(session.user.tenantId, parsed, session.user.id)
    revalidatePath(`/catering/ruta/${routeId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: formatZodError(error) }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Error al reportar la incidencia' }
  }
}
