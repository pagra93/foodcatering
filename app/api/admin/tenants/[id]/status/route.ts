/**
 * API Route para cambiar el estado de un tenant
 */

import { type NextRequest, NextResponse } from 'next/server'
import { updateTenantStatusSchema } from '@/lib/validations/tenant'
import { updateTenantStatus } from '@/lib/db/queries/tenants'
import { auth } from '@/lib/auth'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

type Params = {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: Params) {
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
    const data = updateTenantStatusSchema.parse({ ...body, id: params.id })

    const tenant = await updateTenantStatus(data, session.user.id)

    return NextResponse.json({
      success: true,
      tenant,
      message: `Tenant ${data.status.toLowerCase()} exitosamente`
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'POST /api/admin/tenants/[id]/status',
      requestId: requestIdFrom(request),
      fallback: 'Error al cambiar el estado del tenant',
    })
  }
}
