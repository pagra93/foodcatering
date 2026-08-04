/**
 * API: Dashboard del Catering
 * GET /api/catering/dashboard
 *
 * Retorna KPIs, alertas y actividad reciente para el dashboard del catering
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { getCateringDashboard } from '@/lib/db/queries/catering-dashboard'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

export async function GET(request: Request) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Verificar que el usuario es del catering
    const cateringRoles = [
      'ADMIN_CATERING',
      'CHEF',
      'COCINERO',
      'REPARTIDOR',
      'FINANZAS_CATERING',
    ]

    if (!permittedAction(session.user.permissions, session.user.role, 'cat-dashboard:view', cateringRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    // Verificar que el tenant es de tipo CATERING
    if (session.user.tenantType !== 'CATERING') {
      return apiError(403, 'Tenant inválido')
    }

    // Obtener datos del dashboard
    const dashboardData = await getCateringDashboard(session.user.tenantId)

    return NextResponse.json({
      success: true,
      data: dashboardData,
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'GET /api/catering/dashboard',
      requestId: requestIdFrom(request),
      fallback: 'Error al cargar el dashboard',
    })
  }
}
