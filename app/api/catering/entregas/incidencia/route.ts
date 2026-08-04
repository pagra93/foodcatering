/**
 * API: Reportar Incidencia
 * POST /api/catering/entregas/incidencia
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { reportDeliveryIncident } from '@/lib/db/queries/catering-delivery'
import { reportIncidentSchema } from '@/lib/validations/delivery'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF', 'REPARTIDOR']

    if (!permittedAction(session.user.permissions, session.user.role, 'cat-incident:view', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }

    const validatedData = reportIncidentSchema.parse(body)

    const incident = await reportDeliveryIncident(session.user.tenantId, validatedData)

    return NextResponse.json({
      success: true,
      data: incident,
      message: 'Incidencia reportada correctamente',
    })
  } catch (error) {
    // Mensaje de negocio conocido (lib/db/queries/catering-delivery.ts#reportDeliveryIncident).
    if (error instanceof Error && error.message === 'Pedido no encontrado') {
      return apiError(404, error.message)
    }
    return apiErrorFrom(error, {
      route: 'POST /api/catering/entregas/incidencia',
      requestId: requestIdFrom(request),
      fallback: 'Error al reportar la incidencia',
    })
  }
}
