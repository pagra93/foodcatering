/**
 * API: Rutas
 * GET /api/catering/rutas - Listar rutas
 * POST /api/catering/rutas - Crear ruta
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { getRoutes, createRoute } from '@/lib/db/queries/catering-routes'
import { createRouteSchema } from '@/lib/validations/delivery'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

/**
 * GET - Listar rutas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF', 'REPARTIDOR']

    if (!permittedAction(session.user.permissions, session.user.role, 'route:view', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const deliveryUserId = searchParams.get('deliveryUserId')

    const filters: { date?: Date; status?: string; deliveryUserId?: string } = {}

    if (date) {
      filters.date = new Date(date)
    }

    if (status) {
      filters.status = status
    }

    if (deliveryUserId) {
      filters.deliveryUserId = deliveryUserId
    } else if (session.user.role === 'REPARTIDOR') {
      // Si es repartidor, solo ver sus rutas
      filters.deliveryUserId = session.user.id
    }

    const routes = await getRoutes(session.user.tenantId, filters)

    return NextResponse.json({
      success: true,
      data: routes,
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'GET /api/catering/rutas',
      requestId: requestIdFrom(request),
      fallback: 'Error al obtener las rutas',
    })
  }
}

/**
 * POST - Crear ruta
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF']

    if (!permittedAction(session.user.permissions, session.user.role, 'route:create', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }

    const validatedData = createRouteSchema.parse({
      ...body,
      date: new Date(body.date),
    })

    const route = await createRoute(session.user.tenantId, validatedData)

    return NextResponse.json({
      success: true,
      data: route,
      message: 'Ruta creada correctamente',
    })
  } catch (error) {
    // Mensajes de negocio conocidos (lib/db/queries/catering-routes.ts#createRoute).
    if (
      error instanceof Error &&
      error.message === 'Alguna sede no pertenece a una empresa cliente de este catering'
    ) {
      return apiError(400, error.message)
    }
    if (error instanceof Error && error.message === 'Repartidor no encontrado') {
      return apiError(404, error.message)
    }
    return apiErrorFrom(error, {
      route: 'POST /api/catering/rutas',
      requestId: requestIdFrom(request),
      fallback: 'Error al crear la ruta',
    })
  }
}
