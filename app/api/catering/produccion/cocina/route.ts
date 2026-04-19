/**
 * API: Kitchen Display
 * GET /api/catering/produccion/cocina
 * 
 * Obtiene datos consolidados para pantalla de cocina
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getKitchenDisplay } from '@/lib/db/queries/catering-production'
import { kitchenDisplaySchema } from '@/lib/validations/production'
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

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Parsear query params
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const course = searchParams.get('course')

    if (!date || !course) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requieren date y course',
        },
        { status: 400 }
      )
    }

    // Validar query
    const query = kitchenDisplaySchema.parse({
      date: new Date(date),
      course,
    })

    // Obtener datos
    const data = await getKitchenDisplay(
      session.user.tenantId,
      query.date,
      query.course
    )

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('[KITCHEN_DISPLAY_GET]', error)

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
        error: 'Error al obtener datos de cocina',
      },
      { status: 500 }
    )
  }
}

