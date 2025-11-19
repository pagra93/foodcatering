/**
 * API: Ruta Individual
 * GET /api/catering/rutas/[id] - Obtener ruta
 * PATCH /api/catering/rutas/[id] - Actualizar ruta
 * DELETE /api/catering/rutas/[id] - Cancelar ruta
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getRouteById,
  updateRoute,
  cancelRoute,
} from '@/lib/db/queries/catering-routes'
import { updateRouteSchema } from '@/lib/validations/delivery'
import { ZodError } from 'zod'

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * GET - Obtener ruta
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const route = await getRouteById(session.user.tenantId, params.id)

    if (!route) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ruta no encontrada',
        },
        { status: 404 }
      )
    }

    // Si es repartidor, verificar que es su ruta
    if (session.user.role === 'REPARTIDOR' && route.deliveryUser?.id !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: route,
    })
  } catch (error) {
    console.error('[ROUTE_GET]', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener ruta',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Actualizar ruta
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
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

    const validatedData = updateRouteSchema.parse(body)

    const updated = await updateRoute(session.user.tenantId, params.id, validatedData)

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Ruta actualizada correctamente',
    })
  } catch (error) {
    console.error('[ROUTE_PATCH]', error)

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
        error: 'Error al actualizar ruta',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Cancelar ruta
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
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
    const reason = body.reason

    const cancelled = await cancelRoute(session.user.tenantId, params.id, reason)

    return NextResponse.json({
      success: true,
      data: cancelled,
      message: 'Ruta cancelada correctamente',
    })
  } catch (error) {
    console.error('[ROUTE_DELETE]', error)

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
        error: 'Error al cancelar ruta',
      },
      { status: 500 }
    )
  }
}

