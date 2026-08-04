/**
 * API: Completar Ruta
 * POST /api/catering/rutas/[id]/completar
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { completeRoute } from '@/lib/db/queries/catering-routes'
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

    if (!permittedAction(session.user.permissions, session.user.role, 'route:complete', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
    const notes = body.notes

    const completed = await completeRoute(session.user.tenantId, params.id, notes)

    // Best-effort tras el éxito: logAudit nunca rompe el flujo.
    await logAudit({
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      action: 'ROUTE_COMPLETED',
      entity: 'DeliveryRoute',
      entityId: params.id,
      diff: { after: { status: completed.status } },
    })

    return NextResponse.json({
      success: true,
      data: completed,
      message: 'Ruta completada correctamente',
    })
  } catch (error) {
    // Mensajes de negocio conocidos (lib/db/queries/catering-routes.ts#completeRoute).
    if (error instanceof Error && error.message === 'Ruta no encontrada') {
      return apiError(404, error.message)
    }
    if (error instanceof Error && error.message === 'La ruta no está en curso') {
      return apiError(409, error.message)
    }
    if (error instanceof Error && error.message === 'Aún hay pedidos sin entregar') {
      return apiError(400, error.message)
    }
    return apiErrorFrom(error, {
      route: 'POST /api/catering/rutas/[id]/completar',
      requestId: requestIdFrom(request),
      fallback: 'Error al completar la ruta',
    })
  }
}
