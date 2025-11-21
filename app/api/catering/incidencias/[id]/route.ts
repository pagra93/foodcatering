import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { resolveIncident } from '@/lib/db/queries/catering-incidencias'
import { z } from 'zod'

// ============================================================================
// PATCH /api/catering/incidencias/[id] - Actualizar/Resolver incidencia
// ============================================================================

const updateIncidentSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'RESOLVED', 'COMPENSATED']),
  resolutionType: z.string().min(1),
  resolutionDetails: z.string().min(10),
  compensationAmount: z.number().min(0).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validated = updateIncidentSchema.parse(body)

    const incident = await resolveIncident(
      params.id,
      session.user.tenantId,
      session.user.id,
      {
        resolutionType: validated.resolutionType,
        resolutionDetails: validated.resolutionDetails,
        compensationAmount: validated.compensationAmount,
      }
    )

    return NextResponse.json(incident)
  } catch (error) {
    console.error('[INCIDENT_UPDATE]', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Error al actualizar incidencia' },
      { status: 500 }
    )
  }
}

