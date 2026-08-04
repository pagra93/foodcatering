/**
 * API: Plato Individual
 * GET /api/catering/platos/[id] - Obtener detalle
 * PATCH /api/catering/platos/[id] - Actualizar
 * DELETE /api/catering/platos/[id] - Eliminar (soft delete)
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import {
  getDishById,
  updateDish,
  deleteDish,
  dishNameExists,
} from '@/lib/db/queries/catering-dishes'
import { updateDishSchema } from '@/lib/validations/dish'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * GET - Obtener detalle de un plato
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Verificar permisos
    const allowedRoles = [
      'ADMIN_CATERING',
      'CHEF',
      'COCINERO',
      'REPARTIDOR',
      'FINANZAS_CATERING',
    ]

    if (!permittedAction(session.user.permissions, session.user.role, 'dish:view', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    // Obtener plato
    const dish = await getDishById(params.id, session.user.tenantId)

    if (!dish) {
      return apiError(404, 'Plato no encontrado')
    }

    return NextResponse.json({
      success: true,
      data: dish,
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'GET /api/catering/platos/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al obtener el plato',
    })
  }
}

/**
 * PATCH - Actualizar un plato
 */
export async function PATCH(
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

    if (!permittedAction(session.user.permissions, session.user.role, 'dish:edit', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    // Parsear body
    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }

    // Validar datos
    const validatedData = updateDishSchema.parse(body)

    // Si se actualiza el nombre, verificar que no exista otro con ese nombre
    if (validatedData.name) {
      const nameExists = await dishNameExists(
        session.user.tenantId,
        validatedData.name,
        params.id // Excluir el plato actual
      )

      if (nameExists) {
        return apiError(409, 'Ya existe otro plato con ese nombre')
      }
    }

    // Actualizar plato
    const dish = await updateDish(
      params.id,
      session.user.tenantId,
      validatedData
    )

    return NextResponse.json({
      success: true,
      data: dish,
      message: 'Plato actualizado correctamente',
    })
  } catch (error) {
    // Mensaje de negocio conocido (lib/db/queries/catering-dishes.ts#updateDish).
    if (error instanceof Error && error.message === 'Dish not found') {
      return apiError(404, 'Plato no encontrado')
    }
    return apiErrorFrom(error, {
      route: 'PATCH /api/catering/platos/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al actualizar el plato',
    })
  }
}

/**
 * DELETE - Eliminar un plato (soft delete)
 */
export async function DELETE(
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

    if (!permittedAction(session.user.permissions, session.user.role, 'dish:delete', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    // Eliminar plato
    await deleteDish(params.id, session.user.tenantId)

    return NextResponse.json({
      success: true,
      message: 'Plato eliminado correctamente',
    })
  } catch (error) {
    // Mensajes de negocio conocidos (lib/db/queries/catering-dishes.ts#deleteDish).
    if (error instanceof Error && error.message === 'Dish not found') {
      return apiError(404, 'Plato no encontrado')
    }
    if (
      error instanceof Error &&
      error.message.startsWith('No se puede eliminar. El plato está en')
    ) {
      return apiError(409, error.message)
    }
    return apiErrorFrom(error, {
      route: 'DELETE /api/catering/platos/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al eliminar el plato',
    })
  }
}
