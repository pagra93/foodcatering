import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth/session'
import { getCateringRatings } from '@/lib/db/queries/empresa-catering'

/**
 * GET /api/empresa/catering/ratings
 * Obtener valoraciones de empleados para el catering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession()
    const searchParams = request.nextUrl.searchParams
    
    const tenantId = searchParams.get('tenantId')
    const cateringId = searchParams.get('cateringId')
    const page = parseInt(searchParams.get('page') || '1')

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

    const result = await getCateringRatings(tenantId, cateringId, page, 10)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching ratings:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener valoraciones' },
      { status: 500 }
    )
  }
}

