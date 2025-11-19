/**
 * API: Generar Etiquetas
 * POST /api/catering/produccion/etiquetas
 * 
 * Genera PDF con etiquetas para impresora térmica
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getOrdersForLabels } from '@/lib/db/queries/catering-production'
import { generateLabelsSchema } from '@/lib/validations/production'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const allowedRoles = [
      'ADMIN_CATERING',
      'CHEF',
      'COCINERO',
    ]

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Parsear body
    const body = await request.json()

    // Validar datos
    const validatedData = generateLabelsSchema.parse({
      date: new Date(body.date),
      companyId: body.companyId || undefined,
      siteId: body.siteId || undefined,
      orderIds: body.orderIds || undefined,
    })

    // Obtener datos para etiquetas
    const labels = await getOrdersForLabels(
      session.user.tenantId,
      validatedData.date,
      {
        companyId: validatedData.companyId,
        siteId: validatedData.siteId,
        orderIds: validatedData.orderIds,
      }
    )

    // TODO: Generar PDF con las etiquetas
    // Por ahora retornamos los datos JSON
    // En producción, usar una librería como pdfkit o puppeteer

    return NextResponse.json({
      success: true,
      data: {
        totalLabels: labels.length,
        labels,
      },
      // TODO: En producción, retornar el PDF
      // pdfUrl: '/path/to/generated/labels.pdf',
    })
  } catch (error) {
    console.error('[GENERATE_LABELS_POST]', error)

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

    return NextResponse.json(
      {
        success: false,
        error: 'Error al generar etiquetas',
      },
      { status: 500 }
    )
  }
}

