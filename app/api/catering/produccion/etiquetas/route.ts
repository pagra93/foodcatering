/**
 * API: Generar Etiquetas
 * POST /api/catering/produccion/etiquetas
 *
 * Genera PDF con etiquetas para impresora térmica
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { getOrdersForLabels } from '@/lib/db/queries/catering-production'
import { generateLabelsSchema } from '@/lib/validations/production'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Imprimir etiquetas es exclusivo de ADMIN_CATERING (production:print-labels
    // solo lo tiene ese rol en el catálogo).
    const allowedRoles = ['ADMIN_CATERING']

    if (!permittedAction(session.user.permissions, session.user.role, 'production:print-labels', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    // Parsear body
    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }

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
    return apiErrorFrom(error, {
      route: 'POST /api/catering/produccion/etiquetas',
      requestId: requestIdFrom(request),
      fallback: 'Error al generar las etiquetas',
    })
  }
}
