/**
 * API: Confirmar Entrega
 * POST /api/catering/entregas/confirmar
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { confirmDelivery } from '@/lib/db/queries/catering-delivery'
import { confirmDeliverySchema } from '@/lib/validations/delivery'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF', 'REPARTIDOR']

    if (!permittedAction(session.user.permissions, session.user.role, 'route:confirm-delivery', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }

    const validatedData = confirmDeliverySchema.parse({
      ...body,
      deliveredAt: new Date(body.deliveredAt),
    })

    const confirmed = await confirmDelivery(session.user.tenantId, validatedData)

    return NextResponse.json({
      success: true,
      data: confirmed,
      message: 'Entrega confirmada correctamente',
    })
  } catch (error) {
    // Mensajes de negocio conocidos (lib/db/queries/catering-delivery.ts#confirmDelivery).
    if (error instanceof Error && error.message === 'Pedido no encontrado') {
      return apiError(404, error.message)
    }
    if (error instanceof Error && error.message === 'El pedido ya fue entregado') {
      return apiError(409, error.message)
    }
    return apiErrorFrom(error, {
      route: 'POST /api/catering/entregas/confirmar',
      requestId: requestIdFrom(request),
      fallback: 'Error al confirmar la entrega',
    })
  }
}
