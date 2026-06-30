/**
 * API: Completar Ruta
 * POST /api/catering/rutas/[id]/completar
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { completeRoute } from '@/lib/db/queries/catering-routes'

type RouteContext = {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF', 'REPARTIDOR']

    if (!permittedAction(session.user.permissions, session.user.role, 'route:complete', allowedRoles)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const notes = body.notes

    const completed = await completeRoute(session.user.tenantId, params.id, notes)

    return NextResponse.json({
      success: true,
      data: completed,
      message: 'Ruta completada correctamente',
    })
  } catch (error) {
    console.error('[COMPLETE_ROUTE_POST]', error)

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
        error: 'Error al completar ruta',
      },
      { status: 500 }
    )
  }
}

