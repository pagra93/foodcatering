import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { resolveIncident } from '@/lib/db/queries/catering-incidencias'
import { z } from 'zod'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

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

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Autorización (M9): resolver/compensar una incidencia es acción de gestión,
    // no de cualquier rol operativo (un REPARTIDOR sólo tiene cat-incident:view).
    if (
      !permittedAction(
        session.user.permissions,
        session.user.role as string,
        'cat-incident:resolve',
        ['SUPER_ADMIN', 'ADMIN_CATERING']
      )
    ) {
      return apiError(403, 'Sin permisos')
    }

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
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
    // Mensaje de negocio conocido (lib/db/queries/catering-incidencias.ts#resolveIncident).
    if (error instanceof Error && error.message === 'Incidencia no encontrada') {
      return apiError(404, error.message)
    }
    return apiErrorFrom(error, {
      route: 'PATCH /api/catering/incidencias/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al actualizar la incidencia',
    })
  }
}
