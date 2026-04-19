/**
 * API: Factura Individual
 * GET /api/catering/facturas/[id] - Obtener factura
 * PATCH /api/catering/facturas/[id] - Actualizar estado
 * DELETE /api/catering/facturas/[id] - Cancelar factura
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getInvoiceById,
  updateInvoiceStatus,
  cancelInvoice,
} from '@/lib/db/queries/catering-invoices'
import { updateInvoiceStatusSchema } from '@/lib/validations/invoice'
import { ZodError } from 'zod'

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * GET - Obtener factura
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const invoice = await getInvoiceById(session.user.tenantId, params.id)

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          error: 'Factura no encontrada',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: invoice,
    })
  } catch (error) {
    console.error('[INVOICE_GET]', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener factura',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Actualizar estado
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
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

    const validatedData = updateInvoiceStatusSchema.parse(body)

    const updated = await updateInvoiceStatus(
      session.user.tenantId,
      params.id,
      validatedData.status,
      session.user.id,
      validatedData.notes ?? undefined
    )

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Estado actualizado correctamente',
    })
  } catch (error) {
    console.error('[INVOICE_PATCH]', error)

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
        error: 'Error al actualizar estado',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Cancelar factura
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
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
    const reason = body.reason || 'Sin motivo especificado'

    const cancelled = await cancelInvoice(
      session.user.tenantId,
      params.id,
      reason,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: cancelled,
      message: 'Factura cancelada correctamente',
    })
  } catch (error) {
    console.error('[INVOICE_DELETE]', error)

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
        error: 'Error al cancelar factura',
      },
      { status: 500 }
    )
  }
}

