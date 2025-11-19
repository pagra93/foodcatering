/**
 * API: Generar Factura
 * POST /api/catering/facturas/generar
 * 
 * Genera factura para una empresa en un período específico
 * CRÍTICO: Cálculos financieros precisos
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateInvoice } from '@/lib/db/queries/catering-invoices'
import { generateInvoiceSchema, canGenerateInvoiceForPeriod } from '@/lib/validations/invoice'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo ADMIN_CATERING y FINANZAS_CATERING pueden generar facturas
    const allowedRoles = ['ADMIN_CATERING', 'FINANZAS_CATERING']

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()

    // Validar datos
    const validatedData = generateInvoiceSchema.parse(body)

    // Validar que el período puede facturarse
    const periodValidation = canGenerateInvoiceForPeriod(
      validatedData.period.year,
      validatedData.period.month
    )

    if (!periodValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: periodValidation.reason,
        },
        { status: 400 }
      )
    }

    // Generar factura
    const invoice = await generateInvoice(session.user.tenantId, validatedData)

    return NextResponse.json({
      success: true,
      data: invoice,
      message: 'Factura generada correctamente',
    })
  } catch (error) {
    console.error('[GENERATE_INVOICE_POST]', error)

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
        error: 'Error al generar factura',
      },
      { status: 500 }
    )
  }
}

