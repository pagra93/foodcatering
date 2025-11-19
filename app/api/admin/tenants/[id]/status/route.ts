/**
 * API Route para cambiar el estado de un tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateTenantStatusSchema } from '@/lib/validations/tenant'
import { updateTenantStatus } from '@/lib/db/queries/tenants'
import { getRequiredSession } from '@/lib/auth/session'
import { ZodError } from 'zod'

type Params = {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getRequiredSession()
    
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = updateTenantStatusSchema.parse({ ...body, id: params.id })

    const tenant = await updateTenantStatus(data, session.user.id)

    return NextResponse.json({
      success: true,
      tenant,
      message: `Tenant ${data.status.toLowerCase()} exitosamente`
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

