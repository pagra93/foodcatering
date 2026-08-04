/**
 * API: Platos del Catering
 * GET /api/catering/platos - Lista con filtros
 * POST /api/catering/platos - Crear plato
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { getDishes, createDish, dishNameExists } from '@/lib/db/queries/catering-dishes'
import { createDishSchema, dishFiltersSchema } from '@/lib/validations/dish'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

/**
 * GET - Obtener lista de platos con filtros
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Verificar permisos (todos los roles pueden ver platos)
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
    return apiErrorFrom(error, {
      route: 'GET /api/catering/platos',
      requestId: requestIdFrom(request),
      fallback: 'Error al obtener los platos',
    })
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
      return apiError(401, 'No autenticado')
    }

    // Verificar permisos (solo ADMIN_CATERING y CHEF)
    const allowedRoles = ['ADMIN_CATERING', 'CHEF']

    if (!permittedAction(session.user.permissions, session.user.role, 'dish:create', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    // Parsear body
    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }

    // Validar datos
    const validatedData = createDishSchema.parse(body)

    // Verificar que el nombre no exista
    const nameExists = await dishNameExists(
      session.user.tenantId,
      validatedData.name
    )

    if (nameExists) {
      return apiError(409, 'Ya existe un plato con ese nombre')
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
    // Mensaje de negocio conocido (lib/db/queries/catering-dishes.ts#createDish).
    if (error instanceof Error && error.message === 'Restaurant not found for this tenant') {
      return apiError(404, 'Restaurant no encontrado')
    }
    return apiErrorFrom(error, {
      route: 'POST /api/catering/platos',
      requestId: requestIdFrom(request),
      fallback: 'Error al crear el plato',
    })
  }
}
