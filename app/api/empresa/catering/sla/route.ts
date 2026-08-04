import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCateringSLAMetrics } from '@/lib/db/queries/empresa-catering'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

/**
 * GET /api/empresa/catering/sla
 * Obtener métricas detalladas de SLA del catering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const searchParams = request.nextUrl.searchParams

    const tenantId = searchParams.get('tenantId')
    const cateringId = searchParams.get('cateringId')

    if (!tenantId || !cateringId) {
      return apiError(400, 'Faltan parámetros obligatorios')
    }

    // Verificar permisos
    if (session.user.tenantId !== tenantId && session.user.role !== 'SUPER_ADMIN') {
      return apiError(403, 'Sin permisos')
    }

    const metrics = await getCateringSLAMetrics(tenantId, cateringId)

    return NextResponse.json(metrics)
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'GET /api/empresa/catering/sla',
      requestId: requestIdFrom(request),
      fallback: 'Error al obtener las métricas',
    })
  }
}
