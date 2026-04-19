/**
 * API Route para crear un tenant
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createTenantSchema } from '@/lib/validations/tenant'
import { createTenant, checkSubdomainAvailability } from '@/lib/db/queries/tenants'
import { getRequiredSession } from '@/lib/auth/session'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const session = await getRequiredSession()
    
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      )
    }

    // Parsear y validar body
    const body = await request.json()
    const data = createTenantSchema.parse(body)

    // Verificar disponibilidad del subdominio
    const isAvailable = await checkSubdomainAvailability(data.subdomain)
    if (!isAvailable) {
      return NextResponse.json(
        { error: 'El subdominio ya está en uso' },
        { status: 400 }
      )
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

