/**
 * API: Reportar Incidencia
 * POST /api/catering/entregas/incidencia
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { reportDeliveryIncident } from '@/lib/db/queries/catering-delivery'
import { reportIncidentSchema } from '@/lib/validations/delivery'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF', 'REPARTIDOR']

    if (!permittedAction(session.user.permissions, session.user.role, 'cat-incident:view', allowedRoles)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()

    const validatedData = reportIncidentSchema.parse(body)

    const incident = await reportDeliveryIncident(session.user.tenantId, validatedData)

    return NextResponse.json({
      success: true,
      data: incident,
      message: 'Incidencia reportada correctamente',
    })
  } catch (error) {
    console.error('[REPORT_INCIDENT_POST]', error)

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
        error: 'Error al reportar incidencia',
      },
      { status: 500 }
    )
  }
}

