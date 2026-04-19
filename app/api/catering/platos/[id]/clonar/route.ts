/**
 * API: Clonar Plato
 * POST /api/catering/platos/[id]/clonar - Duplicar un plato
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cloneDish } from '@/lib/db/queries/catering-dishes'
import { cloneDishSchema } from '@/lib/validations/dish'
import { ZodError } from 'zod'

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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos (solo ADMIN_CATERING y CHEF)
    const allowedRoles = ['ADMIN_CATERING', 'CHEF']

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
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
    console.error('[DISH_CLONE]', error)

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
        error: 'Error al clonar plato',
      },
      { status: 500 }
    )
  }
}

