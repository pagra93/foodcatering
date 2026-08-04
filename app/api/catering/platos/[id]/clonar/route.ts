/**
 * API: Clonar Plato
 * POST /api/catering/platos/[id]/clonar - Duplicar un plato
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { cloneDish } from '@/lib/db/queries/catering-dishes'
import { cloneDishSchema } from '@/lib/validations/dish'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * POST - Clonar un plato
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Verificar permisos (solo ADMIN_CATERING y CHEF)
    const allowedRoles = ['ADMIN_CATERING', 'CHEF']

    if (!permittedAction(session.user.permissions, session.user.role, 'dish:clone', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    // Parsear body (opcional: puede incluir newName)
    const body = await request.json().catch(() => ({}))

    // Validar datos
    const validatedData = cloneDishSchema.parse(body)

    // Clonar plato
    const clonedDish = await cloneDish(
      params.id,
      session.user.tenantId,
      validatedData.newName
    )

    return NextResponse.json(
      {
        success: true,
        data: clonedDish,
        message: 'Plato clonado correctamente',
      },
      { status: 201 }
    )
  } catch (error) {
    // Mensaje de negocio conocido (lib/db/queries/catering-dishes.ts#cloneDish).
    if (error instanceof Error && error.message === 'Dish not found') {
      return apiError(404, 'Plato no encontrado')
    }
    return apiErrorFrom(error, {
      route: 'POST /api/catering/platos/[id]/clonar',
      requestId: requestIdFrom(request),
      fallback: 'Error al clonar el plato',
    })
  }
}
