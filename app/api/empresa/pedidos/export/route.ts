import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth/session'
import { exportOrdersCSV, type OrderFilters } from '@/lib/db/queries/empresa-pedidos'

/**
 * GET /api/empresa/pedidos/export
 * Exportar pedidos a CSV
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession()
    const tenantId = request.headers.get('x-tenant-id')

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID missing' }, { status: 400 })
    }

    // Verificar permisos
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'RRHH', 'FINANZAS']
    if (!allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Obtener parámetros de filtros desde query
    const searchParams = request.nextUrl.searchParams
    const filters: OrderFilters = {
      status: searchParams.get('status') || undefined,
      period: (searchParams.get('period') as any) || 'month',
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      employeeId: searchParams.get('employeeId') || undefined,
      siteId: searchParams.get('siteId') || undefined,
    }

    const result = await exportOrdersCSV(tenantId, filters)

    // Retornar CSV con headers apropiados
    return new NextResponse(result.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Total-Orders': result.stats.totalOrders.toString(),
        'X-Total-Amount': result.stats.totalAmount.toFixed(2),
      },
    })
  } catch (error: any) {
    console.error('Error exporting orders:', error)
    return NextResponse.json(
      { error: error.message || 'Error al exportar pedidos' },
      { status: 500 }
    )
  }
}

