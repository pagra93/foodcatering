import { type NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth/session'
import { getCateringSLAMetrics } from '@/lib/db/queries/empresa-catering'

/**
 * GET /api/empresa/catering/sla
 * Obtener métricas detalladas de SLA del catering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession()
    const searchParams = request.nextUrl.searchParams
    
    const tenantId = searchParams.get('tenantId')
    const cateringId = searchParams.get('cateringId')

    if (!tenantId || !cateringId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Verificar permisos
    if (session.user.tenantId !== tenantId && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const metrics = await getCateringSLAMetrics(tenantId, cateringId)

    return NextResponse.json(metrics)
  } catch (error: any) {
    console.error('Error fetching SLA metrics:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener métricas' },
      { status: 500 }
    )
  }
}

