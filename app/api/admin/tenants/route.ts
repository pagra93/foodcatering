/**
 * API Route para crear un tenant
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createTenantSchema } from '@/lib/validations/tenant'
import { createTenant, checkSubdomainAvailability } from '@/lib/db/queries/tenants'
import { auth } from '@/lib/auth'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return apiError(403, 'No tienes permisos para esta acción')
    }

    // Parsear y validar body
    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
    const data = createTenantSchema.parse(body)

    // Verificar disponibilidad del subdominio
    const isAvailable = await checkSubdomainAvailability(data.subdomain)
    if (!isAvailable) {
      return apiError(400, 'El subdominio ya está en uso')
    }

    // Crear tenant
    const tenant = await createTenant(data, session.user.id)

    return NextResponse.json(
      {
        success: true,
        tenant,
        message: 'Tenant creado exitosamente'
      },
      { status: 201 }
    )
  } catch (error) {
    // Mensaje de negocio conocido (lib/db/queries/tenants.ts#createTenant).
    if (error instanceof Error && error.message === 'El subdominio ya está en uso') {
      return apiError(400, error.message)
    }
    return apiErrorFrom(error, {
      route: 'POST /api/admin/tenants',
      requestId: requestIdFrom(request),
      fallback: 'Error al crear el tenant',
    })
  }
}
