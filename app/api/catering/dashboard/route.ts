/**
 * API: Dashboard del Catering
 * GET /api/catering/dashboard
 * 
 * Retorna KPIs, alertas y actividad reciente para el dashboard del catering
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCateringDashboard } from '@/lib/db/queries/catering-dashboard'

export async function GET() {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar que el usuario es del catering
    const cateringRoles = [
      'ADMIN_CATERING',
      'CHEF',
      'COCINERO',
      'REPARTIDOR',
      'FINANZAS_CATERING',
    ]

    if (!cateringRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      )
    }

    // Verificar que el tenant es de tipo CATERING
    if (session.user.tenantType !== 'CATERING') {
      return NextResponse.json(
        { error: 'Tenant inválido' },
        { status: 403 }
      )
    }

    // Obtener datos del dashboard
    const dashboardData = await getCateringDashboard(session.user.tenantId)

    return NextResponse.json({
      success: true,
      data: dashboardData,
    })
  } catch (error) {
    console.error('[CATERING_DASHBOARD_GET]', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al cargar el dashboard' 
      },
      { status: 500 }
    )
  }
}

