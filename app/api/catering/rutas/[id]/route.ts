/**
 * API: Ruta Individual
 * GET /api/catering/rutas/[id] - Obtener ruta
 * PATCH /api/catering/rutas/[id] - Actualizar ruta
 * DELETE /api/catering/rutas/[id] - Cancelar ruta
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import {
  getRouteById,
  updateRoute,
  cancelRoute,
} from '@/lib/db/queries/catering-routes'
import { updateRouteSchema } from '@/lib/validations/delivery'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * GET - Obtener ruta
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const route = await getRouteById(session.user.tenantId, params.id)

    if (!route) {
      return apiError(404, 'Ruta no encontrada')
    }

    // Si es repartidor, verificar que es su ruta
    if (session.user.role === 'REPARTIDOR' && route.deliveryUser?.id !== session.user.id) {
      return apiError(403, 'Acceso denegado')
    }

    return NextResponse.json({
      success: true,
      data: route,
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'GET /api/catering/rutas/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al obtener la ruta',
    })
  }
}

/**
 * PATCH - Actualizar ruta
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF']

    if (!permittedAction(session.user.permissions, session.user.role, 'route:edit', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }

    const validatedData = updateRouteSchema.parse(body)

    const updated = await updateRoute(session.user.tenantId, params.id, validatedData)

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Ruta actualizada correctamente',
    })
  } catch (error) {
    // Mensajes de negocio conocidos (lib/db/queries/catering-routes.ts#updateRoute).
    if (error instanceof Error && error.message === 'Ruta no encontrada') {
      return apiError(404, error.message)
    }
    if (error instanceof Error && error.message === 'Repartidor no encontrado') {
      return apiError(404, error.message)
    }
    return apiErrorFrom(error, {
      route: 'PATCH /api/catering/rutas/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al actualizar la ruta',
    })
  }
}

/**
 * DELETE - Cancelar ruta
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF']

    if (!permittedAction(session.user.permissions, session.user.role, 'route:delete', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
    const reason = body.reason

    const cancelled = await cancelRoute(session.user.tenantId, params.id, reason)

    // Best-effort tras el éxito: logAudit nunca rompe el flujo.
    await logAudit({
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      action: 'ROUTE_CANCELLED',
      entity: 'DeliveryRoute',
      entityId: params.id,
      diff: { after: { status: cancelled.status } },
    })

    return NextResponse.json({
      success: true,
      data: cancelled,
      message: 'Ruta cancelada correctamente',
    })
  } catch (error) {
    // Mensajes de negocio conocidos (lib/db/queries/catering-routes.ts#cancelRoute).
    if (error instanceof Error && error.message === 'Ruta no encontrada') {
      return apiError(404, error.message)
    }
    if (error instanceof Error && error.message === 'No se puede cancelar una ruta completada') {
      return apiError(409, error.message)
    }
    return apiErrorFrom(error, {
      route: 'DELETE /api/catering/rutas/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al cancelar la ruta',
    })
  }
}
