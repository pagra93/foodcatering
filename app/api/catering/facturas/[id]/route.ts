/**
 * API: Factura Individual
 * GET /api/catering/facturas/[id] - Obtener factura
 * PATCH /api/catering/facturas/[id] - Actualizar estado
 * DELETE /api/catering/facturas/[id] - Cancelar factura
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import {
  getInvoiceById,
  updateInvoiceStatus,
  cancelInvoice,
} from '@/lib/db/queries/catering-invoices'
import { updateInvoiceStatusSchema } from '@/lib/validations/invoice'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * GET - Obtener factura
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const invoice = await getInvoiceById(session.user.tenantId, params.id)

    if (!invoice) {
      return apiError(404, 'Factura no encontrada')
    }

    return NextResponse.json({
      success: true,
      data: invoice,
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'GET /api/catering/facturas/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al obtener la factura',
    })
  }
}

/**
 * PATCH - Actualizar estado
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
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
    // Mensajes de negocio conocidos (lib/db/queries/catering-invoices.ts#updateInvoiceStatus).
    if (error instanceof Error && error.message === 'Factura no encontrada') {
      return apiError(404, error.message)
    }
    if (
      error instanceof Error &&
      error.message === 'Para marcar como pagada usa la acción de pago, no el cambio de estado.'
    ) {
      return apiError(400, error.message)
    }
    if (error instanceof Error && error.message.startsWith('Transición de estado no permitida')) {
      return apiError(400, error.message)
    }
    return apiErrorFrom(error, {
      route: 'PATCH /api/catering/facturas/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al actualizar el estado',
    })
  }
}

/**
 * DELETE - Cancelar factura
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['ADMIN_CATERING', 'FINANZAS_CATERING']

    if (!permittedAction(session.user.permissions, session.user.role, 'invoice:generate', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
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
    // Mensajes de negocio conocidos (lib/db/queries/catering-invoices.ts#cancelInvoice).
    if (error instanceof Error && error.message === 'Factura no encontrada') {
      return apiError(404, error.message)
    }
    if (error instanceof Error && error.message === 'No se puede cancelar una factura pagada') {
      return apiError(409, error.message)
    }
    return apiErrorFrom(error, {
      route: 'DELETE /api/catering/facturas/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al cancelar la factura',
    })
  }
}
