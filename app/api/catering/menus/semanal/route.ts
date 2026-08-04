/**
 * API: Menús Semanales
 * GET /api/catering/menus/semanal
 *
 * Obtiene los menús de una semana completa
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { getWeeklyMenu } from '@/lib/db/queries/catering-menus'
import { weeklyMenuQuerySchema } from '@/lib/validations/menu'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Verificar permisos (todos los roles pueden ver menús)
    const allowedRoles = [
      'ADMIN_CATERING',
      'CHEF',
      'COCINERO',
      'REPARTIDOR',
      'FINANZAS_CATERING',
    ]

    if (!permittedAction(session.user.permissions, session.user.role, 'menu:view', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    // Parsear query params
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return apiError(400, 'Se requieren startDate y endDate')
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
    return apiErrorFrom(error, {
      route: 'GET /api/catering/menus/semanal',
      requestId: requestIdFrom(request),
      fallback: 'Error al obtener los menús',
    })
  }
}
