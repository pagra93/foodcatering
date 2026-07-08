import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createIncident } from '@/lib/db/queries/empleado-incidencias'
import { z } from 'zod'

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

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const validated = createIncidentSchema.parse(body)

    const incident = await createIncident(employee.id, session.user.id, validated)

    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    console.error('[INCIDENT_CREATE]', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Error al crear incidencia' },
      { status: 500 }
    )
  }
}

