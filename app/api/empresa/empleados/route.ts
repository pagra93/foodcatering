import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { getScopedTenantId } from '@/lib/auth/session'
import { createEmployee } from '@/lib/db/queries/empresa-empleados'
import { permittedAction } from '@/lib/auth/permissions'
import { PlanLimitError } from '@/lib/plans/entitlements'
import { z } from 'zod'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

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
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'RRHH']
    if (!permittedAction(session.user.permissions, session.user.role as string, 'employee:create', allowedRoles)) {
      return apiError(403, 'Sin permisos')
    }

    const tenantId = await getScopedTenantId(request)

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
    const validated = createEmployeeSchema.parse(body)

    const employee = await createEmployee(tenantId, validated)

    // Best-effort tras el éxito. Diff sin PII (nada de nombre/email/teléfono).
    await logAudit({
      tenantId,
      actorId: session.user.id,
      action: 'CREATE',
      entity: 'Employee',
      entityId: employee.id,
      diff: {
        after: {
          department: employee.department,
          siteId: employee.siteId,
          status: employee.status,
        },
      },
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    // Cuota del plan superada: mensaje pensado para el usuario (CTA de upgrade).
    if (error instanceof PlanLimitError) {
      return apiError(403, error.message)
    }
    // Mensaje de negocio conocido (lib/db/queries/empresa-empleados.ts#createEmployee).
    if (error instanceof Error && error.message === 'Ya existe un usuario con ese email') {
      return apiError(409, error.message)
    }
    return apiErrorFrom(error, {
      route: 'POST /api/empresa/empleados',
      requestId: requestIdFrom(request),
      fallback: 'Error al crear el empleado',
    })
  }
}
