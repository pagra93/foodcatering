/**
 * API Routes para operaciones individuales de Tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateTenantSchema, updateTenantStatusSchema } from '@/lib/validations/tenant'
import { 
  getTenantById, 
  updateTenant, 
  updateTenantStatus,
  deleteTenant 
} from '@/lib/db/queries/tenants'
import { getRequiredSession } from '@/lib/auth/session'
import { ZodError } from 'zod'

type Params = {
  params: {
    id: string
  }
}

// GET: Obtener tenant por ID
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getRequiredSession()
    
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos' },
        { status: 403 }
      )
    }

    const tenant = await getTenantById(params.id)

    return NextResponse.json({ tenant })
  } catch (error) {
    if (error instanceof Error && error.message === 'Tenant no encontrado') {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar tenant
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getRequiredSession()
    
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = updateTenantSchema.parse({ ...body, id: params.id })

    const { id, ...updateData } = data
    const tenant = await updateTenant(params.id, updateData, session.user.id)

    return NextResponse.json({
      success: true,
      tenant,
      message: 'Tenant actualizado exitosamente'
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

// DELETE: Soft delete de tenant
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getRequiredSession()
    
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos' },
        { status: 403 }
      )
    }

    await deleteTenant(params.id, session.user.id)

    return NextResponse.json({
      success: true,
      message: 'Tenant eliminado exitosamente'
    })
  } catch (error) {
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

