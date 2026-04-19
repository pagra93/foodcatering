/**
 * API: Marcar Factura como Pagada
 * POST /api/catering/facturas/[id]/pagar
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { markInvoiceAsPaid } from '@/lib/db/queries/catering-invoices'
import { markInvoiceAsPaidSchema } from '@/lib/validations/invoice'
import { ZodError } from 'zod'

type RouteContext = {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const allowedRoles = ['ADMIN_CATERING', 'FINANZAS_CATERING']

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()

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
    console.error('[MARK_PAID_POST]', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al marcar factura como pagada',
      },
      { status: 500 }
    )
  }
}

