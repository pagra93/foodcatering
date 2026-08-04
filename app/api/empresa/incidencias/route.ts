import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { createIncident } from '@/lib/db/queries/empresa-incidencias'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

const createSchema = z
  .object({
    orderId: z.string().uuid(),
    reasonId: z.string().uuid().optional(),
    type: z.string().optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    subject: z.string().max(120).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine((d) => d.reasonId || d.type, {
    message: 'Indica el motivo de la incidencia',
  })

// POST /api/empresa/incidencias — la empresa reporta una incidencia sobre un pedido suyo
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }
    if (session.user.tenantType !== 'EMPRESA') {
      return apiError(403, 'Solo empresas')
    }
    const allowedRoles = ['ADMIN_EMPRESA', 'RRHH', 'MANAGER_SEDE', 'SUPER_ADMIN']
    if (
      !permittedAction(
        session.user.permissions,
        session.user.role,
        'emp-incident:create',
        allowedRoles
      )
    ) {
      return apiError(403, 'Sin permiso')
    }

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
    const data = createSchema.parse(body)

    const incident = await createIncident(session.user.tenantId, {
      ...data,
      openedBy: session.user.id,
    })

    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    // Mensajes de negocio conocidos (lib/db/queries/empresa-incidencias.ts#createIncident).
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
      route: 'POST /api/empresa/incidencias',
      requestId: requestIdFrom(request),
      fallback: 'Error al crear la incidencia',
    })
  }
}

// Evita que Next intente prerenderizar (usa auth por request).
export const dynamic = 'force-dynamic'
