import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth/session'
import { getWeeklyMenus } from '@/lib/db/queries/empresa-catering'

/**
 * GET /api/empresa/catering/menus
 * Obtener menús semanales del catering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession()
    const searchParams = request.nextUrl.searchParams
    
    const cateringId = searchParams.get('cateringId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!cateringId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const menus = await getWeeklyMenus(
      cateringId,
      new Date(startDate),
      new Date(endDate)
    )

    return NextResponse.json(menus)
  } catch (error: any) {
    console.error('Error fetching menus:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener menús' },
      { status: 500 }
    )
  }
}

