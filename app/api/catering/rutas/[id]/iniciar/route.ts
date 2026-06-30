/**
 * API: Iniciar Ruta
 * POST /api/catering/rutas/[id]/iniciar
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { startRoute } from '@/lib/db/queries/catering-routes'

type RouteContext = {
  params: {
    id: string
  }
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF', 'REPARTIDOR']

    if (!permittedAction(session.user.permissions, session.user.role, 'route:start', allowedRoles)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const started = await startRoute(session.user.tenantId, params.id)

    return NextResponse.json({
      success: true,
      data: started,
      message: 'Ruta iniciada correctamente',
    })
  } catch (error) {
    console.error('[START_ROUTE_POST]', error)

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
        error: 'Error al iniciar ruta',
      },
      { status: 500 }
    )
  }
}

