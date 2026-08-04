/**
 * API: Facturas
 * GET /api/catering/facturas - Listar facturas
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { getInvoices } from '@/lib/db/queries/catering-invoices'
import { invoiceFiltersSchema } from '@/lib/validations/invoice'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['ADMIN_CATERING', 'FINANZAS_CATERING', 'CHEF']

    if (!permittedAction(session.user.permissions, session.user.role, 'invoice:view', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    // Parsear filtros
    const searchParams = request.nextUrl.searchParams
    const filters: Record<string, unknown> = {}

    if (searchParams.get('companyId')) {
      filters['companyId'] = searchParams.get('companyId')
    }

    if (searchParams.get('status')) {
      filters['status'] = searchParams.get('status')
    }

    if (searchParams.get('year')) {
      filters['year'] = parseInt(searchParams.get('year')!)
    }

    if (searchParams.get('month')) {
      filters['month'] = parseInt(searchParams.get('month')!)
    }

    if (searchParams.get('startDate')) {
      filters['startDate'] = new Date(searchParams.get('startDate')!)
    }

    if (searchParams.get('endDate')) {
      filters['endDate'] = new Date(searchParams.get('endDate')!)
    }

    // Validar filtros
    const validatedFilters = invoiceFiltersSchema.parse(filters)

    // Obtener facturas
    const invoices = await getInvoices(session.user.tenantId, validatedFilters)

    return NextResponse.json({
      success: true,
      data: invoices,
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'GET /api/catering/facturas',
      requestId: requestIdFrom(request),
      fallback: 'Error al obtener las facturas',
    })
  }
}
