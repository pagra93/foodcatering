import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { createIncident } from '@/lib/db/queries/empresa-incidencias'

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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.user.tenantType !== 'EMPRESA') {
      return NextResponse.json({ error: 'Solo empresas' }, { status: 403 })
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
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const body = await request.json()
    const data = createSchema.parse(body)

    const incident = await createIncident(session.user.tenantId, {
      ...data,
      openedBy: session.user.id,
    })

    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Error al crear incidencia'
    // El "Pedido no encontrado" es un 400 de negocio, no un 500.
    const status = message.includes('Pedido no encontrado') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// Evita que Next intente prerenderizar (usa auth por request).
export const dynamic = 'force-dynamic'
