/**
 * API: Packing Display
 * GET /api/catering/produccion/empaquetado
 * 
 * Obtiene lista de pedidos para empaquetado
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { getPackingDisplay } from '@/lib/db/queries/catering-production'
import { packingDisplaySchema } from '@/lib/validations/production'
import { ZodError } from 'zod'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const allowedRoles = [
      'ADMIN_CATERING',
      'CHEF',
      'COCINERO',
    ]

    if (!permittedAction(session.user.permissions, session.user.role, 'production:mark-packed', allowedRoles)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Parsear query params
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const companyId = searchParams.get('companyId')
    const siteId = searchParams.get('siteId')

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere date',
        },
        { status: 400 }
      )
    }

    // Validar query
    const query = packingDisplaySchema.parse({
      date: new Date(date),
      companyId: companyId || undefined,
      siteId: siteId || undefined,
    })

    // Obtener datos
    const data = await getPackingDisplay(session.user.tenantId, query.date, {
      companyId: query.companyId,
      siteId: query.siteId,
    })

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('[PACKING_DISPLAY_GET]', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parámetros inválidos',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener datos de empaquetado',
      },
      { status: 500 }
    )
  }
}

