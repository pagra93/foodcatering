/**
 * API: Facturas
 * GET /api/catering/facturas - Listar facturas
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getInvoices } from '@/lib/db/queries/catering-invoices'
import { invoiceFiltersSchema } from '@/lib/validations/invoice'
import { ZodError } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const allowedRoles = ['ADMIN_CATERING', 'FINANZAS_CATERING', 'CHEF']

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Parsear filtros
    const searchParams = request.nextUrl.searchParams
    const filters: any = {}

    if (searchParams.get('companyId')) {
      filters.companyId = searchParams.get('companyId')
    }

    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')
    }

    if (searchParams.get('year')) {
      filters.year = parseInt(searchParams.get('year')!)
    }

    if (searchParams.get('month')) {
      filters.month = parseInt(searchParams.get('month')!)
    }

    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!)
    }

    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!)
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
    console.error('[INVOICES_GET]', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Filtros inválidos',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener facturas',
      },
      { status: 500 }
    )
  }
}

