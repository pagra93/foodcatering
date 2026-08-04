/**
 * API: Kitchen Display
 * GET /api/catering/produccion/cocina
 *
 * Obtiene datos consolidados para pantalla de cocina
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { getKitchenDisplay } from '@/lib/db/queries/catering-production'
import { kitchenDisplaySchema } from '@/lib/validations/production'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Verificar permisos
    const allowedRoles = [
      'ADMIN_CATERING',
      'CHEF',
      'COCINERO',
    ]

    if (!permittedAction(session.user.permissions, session.user.role, 'production:view', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    // Parsear query params
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const course = searchParams.get('course')

    if (!date || !course) {
      return apiError(400, 'Se requieren date y course')
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
    return apiErrorFrom(error, {
      route: 'GET /api/catering/produccion/cocina',
      requestId: requestIdFrom(request),
      fallback: 'Error al obtener los datos de cocina',
    })
  }
}
