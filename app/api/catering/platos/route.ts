/**
 * API: Platos del Catering
 * GET /api/catering/platos - Lista con filtros
 * POST /api/catering/platos - Crear plato
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDishes, createDish, dishNameExists } from '@/lib/db/queries/catering-dishes'
import { createDishSchema, dishFiltersSchema } from '@/lib/validations/dish'
import { ZodError } from 'zod'

/**
 * GET - Obtener lista de platos con filtros
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos (todos los roles pueden ver platos)
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

    // Parsear query params
    const searchParams = request.nextUrl.searchParams
    const filters = {
      search: searchParams.get('search') || undefined,
      course: searchParams.get('course') || undefined,
      active: searchParams.get('active') || 'all',
      allergens: searchParams.get('allergens')?.split(',') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    }

    // Validar filtros
    const validatedFilters = dishFiltersSchema.parse(filters)

    // Obtener platos
    const result = await getDishes(session.user.tenantId, validatedFilters)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[DISHES_GET]', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Filtros inválidos',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener platos',
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Crear un plato nuevo
 */
export async function POST(request: NextRequest) {
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
    const validatedData = createDishSchema.parse(body)

    // Verificar que el nombre no exista
    const nameExists = await dishNameExists(
      session.user.tenantId,
      validatedData.name
    )

    if (nameExists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ya existe un plato con ese nombre',
        },
        { status: 409 }
      )
    }

    // Crear plato
    const dish = await createDish(session.user.tenantId, validatedData)

    return NextResponse.json(
      {
        success: true,
        data: dish,
        message: 'Plato creado correctamente',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[DISHES_POST]', error)

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

    if (error instanceof Error && error.message === 'Restaurant not found for this tenant') {
      return NextResponse.json(
        {
          success: false,
          error: 'Restaurant no encontrado',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear plato',
      },
      { status: 500 }
    )
  }
}

