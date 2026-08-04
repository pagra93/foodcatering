import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getScopedTenantId } from '@/lib/auth/session'
import { exportOrdersCSV, type OrderFilters } from '@/lib/db/queries/empresa-pedidos'
import { permittedAction } from '@/lib/auth/permissions'
import { exportRateLimiter } from '@/lib/ratelimit'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

/**
 * GET /api/empresa/pedidos/export
 * Exportar pedidos a CSV
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'RRHH', 'FINANZAS']
    if (!permittedAction(session.user.permissions, session.user.role as string, 'emp-order:export', allowedRoles)) {
      return apiError(403, 'Sin permisos')
    }

    const tenantId = await getScopedTenantId(request)

    // Rate limit: 10 exports/h por tenant
    const rl = await exportRateLimiter.check(`export:orders:${tenantId}`)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Demasiados exports, espera un momento' },
        { status: 429, headers: { 'Retry-After': String(rl.resetIn) } }
      )
    }

    // Obtener parámetros de filtros desde query
    const searchParams = request.nextUrl.searchParams
    const period = (searchParams.get('period') ?? 'month') as OrderFilters['period']
    const filters: OrderFilters = {
      status: searchParams.get('status') || undefined,
      period,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      employeeId: searchParams.get('employeeId') || undefined,
      siteId: searchParams.get('siteId') || undefined,
    }

    const result = await exportOrdersCSV(tenantId, filters)

    return new NextResponse(result.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Total-Orders': result.stats.totalOrders.toString(),
        'X-Total-Amount': result.stats.totalAmount.toFixed(2),
      },
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'GET /api/empresa/pedidos/export',
      requestId: requestIdFrom(request),
      fallback: 'Error al exportar los pedidos',
    })
  }
}
