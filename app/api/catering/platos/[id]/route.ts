/**
 * API: Plato Individual
 * GET /api/catering/platos/[id] - Obtener detalle
 * PATCH /api/catering/platos/[id] - Actualizar
 * DELETE /api/catering/platos/[id] - Eliminar (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getDishById,
  updateDish,
  deleteDish,
  dishNameExists,
} from '@/lib/db/queries/catering-dishes'
import { updateDishSchema } from '@/lib/validations/dish'
import { ZodError } from 'zod'

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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const allowedRoles = [
      'ADMIN_CATERING',
      'CHEF',
      'COCINERO',
      'REPARTIDOR',
      'FINANZAS_CATERING',
    ]

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Obtener plato
    const dish = await getDishById(params.id, session.user.tenantId)

    if (!dish) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plato no encontrado',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: dish,
    })
  } catch (error) {
    console.error('[DISH_GET]', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener plato',
      },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos (solo ADMIN_CATERING y CHEF)
    const allowedRoles = ['ADMIN_CATERING', 'CHEF']

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Parsear body
    const body = await request.json()

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
        return NextResponse.json(
          {
            success: false,
            error: 'Ya existe otro plato con ese nombre',
          },
          { status: 409 }
        )
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
    console.error('[DISH_PATCH]', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Dish not found') {
      return NextResponse.json(
        {
          success: false,
          error: 'Plato no encontrado',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar plato',
      },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos (solo ADMIN_CATERING y CHEF)
    const allowedRoles = ['ADMIN_CATERING', 'CHEF']

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Eliminar plato
    await deleteDish(params.id, session.user.tenantId)

    return NextResponse.json({
      success: true,
      message: 'Plato eliminado correctamente',
    })
  } catch (error) {
    console.error('[DISH_DELETE]', error)

    if (error instanceof Error) {
      if (error.message === 'Dish not found') {
        return NextResponse.json(
          {
            success: false,
            error: 'Plato no encontrado',
          },
          { status: 404 }
        )
      }

      if (error.message.includes('está en') && error.message.includes('menú')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar plato',
      },
      { status: 500 }
    )
  }
}

