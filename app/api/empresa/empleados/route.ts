import { type NextRequest, NextResponse } from 'next/server'
import {
  getRequiredSession,
  getScopedTenantId,
  TenantMismatchError,
} from '@/lib/auth/session'
import { createEmployee } from '@/lib/db/queries/empresa-empleados'
import { permittedAction } from '@/lib/auth/permissions'
import { z } from 'zod'

const createEmployeeSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  phone: z.string().optional().nullable(),
  employeeNumber: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  siteId: z.string().min(1),
  startDate: z.string().optional().nullable().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().nullable().transform((val) => val ? new Date(val) : undefined),
  weeklyMenuDays: z.coerce.number().int().min(0).max(7).optional().nullable(),
  monthlyLimit: z.coerce.number().positive().optional().nullable(),
  dietPrefs: z.object({
    allergies: z.array(z.string()).optional(),
    restrictions: z.array(z.string()).optional(),
    preferences: z.array(z.string()).optional(),
  }).optional(),
  notes: z.string().optional().nullable(),
  sendInvitation: z.boolean().default(true),
})

/**
 * POST /api/empresa/empleados
 * Crea un nuevo empleado. tenantId protegido con getScopedTenantId.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession()

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'RRHH']
    if (!permittedAction(session.user.permissions, session.user.role as string, 'employee:create', allowedRoles)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const tenantId = await getScopedTenantId(request)

    const body = await request.json()
    const validated = createEmployeeSchema.parse(body)

    const employee = await createEmployee(tenantId, validated)

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    if (error instanceof TenantMismatchError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Error creating employee:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: (error as unknown as { errors: unknown }).errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al crear empleado' },
      { status: 500 }
    )
  }
}
