/**
 * API: Confirmar Entrega
 * POST /api/catering/entregas/confirmar
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { confirmDelivery } from '@/lib/db/queries/catering-delivery'
import { confirmDeliverySchema } from '@/lib/validations/delivery'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF', 'REPARTIDOR']

    if (!permittedAction(session.user.permissions, session.user.role, 'route:confirm-delivery', allowedRoles)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()

    const validatedData = confirmDeliverySchema.parse({
      ...body,
      deliveredAt: new Date(body.deliveredAt),
    })

    const confirmed = await confirmDelivery(session.user.tenantId, validatedData)

    return NextResponse.json({
      success: true,
      data: confirmed,
      message: 'Entrega confirmada correctamente',
    })
  } catch (error) {
    console.error('[CONFIRM_DELIVERY_POST]', error)

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
        error: 'Error al confirmar entrega',
      },
      { status: 500 }
    )
  }
}

