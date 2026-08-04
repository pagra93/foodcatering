/**
 * API: Iniciar Ruta
 * POST /api/catering/rutas/[id]/iniciar
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { startRoute } from '@/lib/db/queries/catering-routes'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

type RouteContext = {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF', 'REPARTIDOR']

    if (!permittedAction(session.user.permissions, session.user.role, 'route:start', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    const started = await startRoute(session.user.tenantId, params.id)

    // Best-effort tras el éxito: logAudit nunca rompe el flujo.
    await logAudit({
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      action: 'ROUTE_STARTED',
      entity: 'DeliveryRoute',
      entityId: params.id,
      diff: { after: { status: started.status } },
    })

    return NextResponse.json({
      success: true,
      data: started,
      message: 'Ruta iniciada correctamente',
    })
  } catch (error) {
    // Mensajes de negocio conocidos (lib/db/queries/catering-routes.ts#startRoute).
    if (error instanceof Error && error.message === 'Ruta no encontrada') {
      return apiError(404, error.message)
    }
    if (error instanceof Error && error.message === 'La ruta ya está en curso o completada') {
      return apiError(409, error.message)
    }
    if (error instanceof Error && error.message === 'No hay repartidor asignado') {
      return apiError(400, error.message)
    }
    if (error instanceof Error && error.message === 'No hay pedidos en la ruta') {
      return apiError(400, error.message)
    }
    return apiErrorFrom(error, {
      route: 'POST /api/catering/rutas/[id]/iniciar',
      requestId: requestIdFrom(request),
      fallback: 'Error al iniciar la ruta',
    })
  }
}
