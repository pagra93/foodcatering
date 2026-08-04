import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createIncident } from '@/lib/db/queries/empleado-incidencias'
import { z } from 'zod'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

// ============================================================================
// POST /api/empleado/incidencias - Crear nueva incidencia
// ============================================================================

const createIncidentSchema = z
  .object({
    orderId: z.string().uuid(),
    // Motivo del catálogo (preferido) o tipo legacy.
    reasonId: z.string().uuid().optional(),
    type: z.string().optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    subject: z.string().max(120).optional(),
  })
  .refine((d) => d.reasonId || d.type, {
    message: 'Indica el motivo de la incidencia',
  })

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Obtener employeeId del usuario
    const { prisma } = await import('@/lib/db/prisma')
    const employee = await prisma.employee.findFirst({
      where: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        status: 'ACTIVE',
      },
    })

    if (!employee) {
      return apiError(404, 'Empleado no encontrado')
    }

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
    const validated = createIncidentSchema.parse(body)

    const incident = await createIncident(employee.id, session.user.id, validated)

    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    // Mensajes de negocio conocidos (lib/db/queries/empleado-incidencias.ts#createIncident).
    if (error instanceof Error && error.message === 'Pedido no encontrado') {
      return apiError(404, error.message)
    }
    if (error instanceof Error && error.message === 'Motivo no encontrado') {
      return apiError(400, error.message)
    }
    if (error instanceof Error && error.message === 'Falta el motivo de la incidencia') {
      return apiError(400, error.message)
    }
    return apiErrorFrom(error, {
      route: 'POST /api/empleado/incidencias',
      requestId: requestIdFrom(request),
      fallback: 'Error al crear la incidencia',
    })
  }
}
