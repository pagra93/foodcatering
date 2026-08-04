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
    const companyId = searchParams.get('companyId')
    const siteId = searchParams.get('siteId')

    if (!date) {
      return apiError(400, 'Se requiere date')
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
    return apiErrorFrom(error, {
      route: 'GET /api/catering/produccion/empaquetado',
      requestId: requestIdFrom(request),
      fallback: 'Error al obtener los datos de empaquetado',
    })
  }
}
