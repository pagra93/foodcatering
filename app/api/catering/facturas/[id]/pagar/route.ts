/**
 * API: Marcar Factura como Pagada
 * POST /api/catering/facturas/[id]/pagar
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { markInvoiceAsPaid } from '@/lib/db/queries/catering-invoices'
import { markInvoiceAsPaidSchema } from '@/lib/validations/invoice'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

type RouteContext = {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['ADMIN_CATERING', 'FINANZAS_CATERING']

    if (!permittedAction(session.user.permissions, session.user.role, 'invoice:pay', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }

    const validatedData = markInvoiceAsPaidSchema.parse({
      ...body,
      paidAt: new Date(body.paidAt),
    })

    const paid = await markInvoiceAsPaid(
      session.user.tenantId,
      params.id,
      validatedData.paidAt,
      session.user.id,
      validatedData.paymentMethod ?? undefined,
      validatedData.transactionReference ?? undefined,
      validatedData.notes ?? undefined
    )

    return NextResponse.json({
      success: true,
      data: paid,
      message: 'Factura marcada como pagada',
    })
  } catch (error) {
    // Mensajes de negocio conocidos (lib/db/queries/catering-invoices.ts#markInvoiceAsPaid).
    if (error instanceof Error && error.message === 'Factura no encontrada') {
      return apiError(404, error.message)
    }
    if (error instanceof Error && error.message === 'La factura ya está marcada como pagada') {
      return apiError(409, error.message)
    }
    return apiErrorFrom(error, {
      route: 'POST /api/catering/facturas/[id]/pagar',
      requestId: requestIdFrom(request),
      fallback: 'Error al marcar la factura como pagada',
    })
  }
}
