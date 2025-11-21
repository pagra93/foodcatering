import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createIncident } from '@/lib/db/queries/empleado-incidencias'
import { z } from 'zod'

// ============================================================================
// POST /api/empleado/incidencias - Crear nueva incidencia
// ============================================================================

const createIncidentSchema = z.object({
  orderId: z.string().uuid(),
  type: z.enum([
    'DELAYED_DELIVERY',
    'MISSING_ITEM',
    'WRONG_ORDER',
    'QUALITY_ISSUE',
    'ALLERGEN_ISSUE',
    'DAMAGED_PACKAGING',
    'OTHER',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener employeeId del usuario
    const { prisma } = await import('@/lib/db/prisma')
    const employee = await prisma.employee.findFirst({
      where: {
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

