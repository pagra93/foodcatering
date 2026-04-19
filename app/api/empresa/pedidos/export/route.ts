import { type NextRequest, NextResponse } from 'next/server'
import { getRequiredSession, getScopedTenantId, TenantMismatchError } from '@/lib/auth/session'
import { exportOrdersCSV, type OrderFilters } from '@/lib/db/queries/empresa-pedidos'
import { exportRateLimiter } from '@/lib/ratelimit'

/**
 * GET /api/empresa/pedidos/export
 * Exportar pedidos a CSV
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession()

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'RRHH', 'FINANZAS']
    if (!allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
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
    if (error instanceof TenantMismatchError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Error exporting orders:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al exportar pedidos' },
      { status: 500 }
    )
  }
}

