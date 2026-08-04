/**
 * API: Generar Factura
 * POST /api/catering/facturas/generar
 *
 * Genera factura para una empresa en un período específico
 * CRÍTICO: Cálculos financieros precisos
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { generateInvoice } from '@/lib/db/queries/catering-invoices'
import { generateInvoiceSchema, canGenerateInvoiceForPeriod } from '@/lib/validations/invoice'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Solo ADMIN_CATERING y FINANZAS_CATERING pueden generar facturas
    const allowedRoles = ['ADMIN_CATERING', 'FINANZAS_CATERING']

    if (!permittedAction(session.user.permissions, session.user.role, 'invoice:generate', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }

    // Validar datos
    const validatedData = generateInvoiceSchema.parse(body)

    // Validar que el período puede facturarse
    const periodValidation = canGenerateInvoiceForPeriod(
      validatedData.period.year,
      validatedData.period.month
    )

    if (!periodValidation.valid) {
      return apiError(400, periodValidation.reason ?? 'El período no se puede facturar')
    }

    // Generar factura
    const invoice = await generateInvoice(
      session.user.tenantId,
      validatedData,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: invoice,
      message: 'Factura generada correctamente',
    })
  } catch (error) {
    // Mensajes de negocio conocidos (lib/db/queries/catering-invoices.ts#generateInvoice).
    if (error instanceof Error && error.message === 'Empresa no encontrada') {
      return apiError(404, error.message)
    }
    if (error instanceof Error && error.message === 'Ya existe una factura para este período') {
      return apiError(409, error.message)
    }
    if (error instanceof Error && error.message === 'No hay pedidos entregados en este período') {
      return apiError(400, error.message)
    }
    return apiErrorFrom(error, {
      route: 'POST /api/catering/facturas/generar',
      requestId: requestIdFrom(request),
      fallback: 'Error al generar la factura',
    })
  }
}
