/**
 * API: Rutas
 * GET /api/catering/rutas - Listar rutas
 * POST /api/catering/rutas - Crear ruta
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRoutes, createRoute } from '@/lib/db/queries/catering-routes'
import { createRouteSchema } from '@/lib/validations/delivery'
import { ZodError } from 'zod'

/**
 * GET - Listar rutas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF', 'REPARTIDOR']

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const deliveryUserId = searchParams.get('deliveryUserId')

    const filters: any = {}

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
    console.error('[ROUTES_GET]', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener rutas',
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Crear ruta
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF']

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()

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
    console.error('[ROUTES_POST]', error)

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

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear ruta',
      },
      { status: 500 }
    )
  }
}

