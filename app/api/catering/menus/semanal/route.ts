/**
 * API: Menús Semanales
 * GET /api/catering/menus/semanal
 * 
 * Obtiene los menús de una semana completa
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getWeeklyMenu } from '@/lib/db/queries/catering-menus'
import { weeklyMenuQuerySchema } from '@/lib/validations/menu'
import { ZodError } from 'zod'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos (todos los roles pueden ver menús)
    const allowedRoles = [
      'ADMIN_CATERING',
      'CHEF',
      'COCINERO',
      'REPARTIDOR',
      'FINANZAS_CATERING',
    ]

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Parsear query params
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requieren startDate y endDate',
        },
        { status: 400 }
      )
    }

    // Validar query
    const query = weeklyMenuQuerySchema.parse({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    })

    // Obtener menús
    const menus = await getWeeklyMenu(session.user.tenantId, query)

    return NextResponse.json({
      success: true,
      data: menus,
    })
  } catch (error) {
    console.error('[WEEKLY_MENU_GET]', error)

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
        error: 'Error al obtener menús',
      },
      { status: 500 }
    )
  }
}

