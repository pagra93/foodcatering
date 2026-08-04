/**
 * API Routes para operaciones individuales de Tenant
 */

import { type NextRequest, NextResponse } from 'next/server'
import { updateTenantSchema } from '@/lib/validations/tenant'
import {
  getTenantById,
  updateTenant,
  deleteTenant
} from '@/lib/db/queries/tenants'
import { auth } from '@/lib/auth'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

type Params = {
  params: {
    id: string
  }
}

// GET: Obtener tenant por ID
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return apiError(403, 'No tienes permisos')
    }

    const tenant = await getTenantById(params.id)

    return NextResponse.json({ tenant })
  } catch (error) {
    // Mensaje de negocio conocido (lib/db/queries/tenants.ts#getTenantById).
    if (error instanceof Error && error.message === 'Tenant no encontrado') {
      return apiError(404, error.message)
    }
    return apiErrorFrom(error, {
      route: 'GET /api/admin/tenants/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al obtener el tenant',
    })
  }
}

// PATCH: Actualizar tenant
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return apiError(403, 'No tienes permisos')
    }

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
    const data = updateTenantSchema.parse({ ...body, id: params.id })

    const { id, ...updateData } = data
    const tenant = await updateTenant(params.id, updateData, session.user.id)

    return NextResponse.json({
      success: true,
      tenant,
      message: 'Tenant actualizado exitosamente'
    })
  } catch (error) {
    // Mensajes de negocio conocidos (lib/db/queries/tenants.ts#updateTenant).
    if (error instanceof Error && error.message === 'Tenant no encontrado') {
      return apiError(404, error.message)
    }
    if (error instanceof Error && error.message === 'El subdominio ya está en uso') {
      return apiError(400, error.message)
    }
    return apiErrorFrom(error, {
      route: 'PATCH /api/admin/tenants/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al actualizar el tenant',
    })
  }
}

// DELETE: Soft delete de tenant
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return apiError(403, 'No tienes permisos')
    }

    await deleteTenant(params.id, session.user.id)

    return NextResponse.json({
      success: true,
      message: 'Tenant eliminado exitosamente'
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'DELETE /api/admin/tenants/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al eliminar el tenant',
    })
  }
}
