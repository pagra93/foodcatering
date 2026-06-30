import { type NextRequest, NextResponse } from 'next/server'
import { getRequiredSession, getScopedTenantId, TenantMismatchError } from '@/lib/auth/session'
import { updateCompanyPolicy } from '@/lib/db/queries/empresa-configuracion'
import { permittedAction } from '@/lib/auth/permissions'
import { z } from 'zod'

const updatePolicySchema = z.object({
  limitPerDay: z.coerce.number().positive().optional(),
  copayCompany: z.coerce.number().positive().optional(),
  copayEmployee: z.coerce.number().positive().optional(),
  cutoffTime: z.string().optional(),
  daysActive: z.array(z.string()).optional(), // ['monday', 'tuesday', ...]
  noShowRule: z.enum(['CHARGE', 'NO_CHARGE', 'PARTIAL']).optional(),
  effectiveFrom: z.string().optional(), // ISO date
  effectiveTo: z.string().optional(), // ISO date
  changeReason: z.string().min(10, 'Razón requerida'),
})

/**
 * PATCH /api/empresa/configuracion/plan
 * Actualizar política y plan de la empresa
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getRequiredSession()

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA']
    if (!permittedAction(session.user.permissions, session.user.role as string, 'emp-config:edit-plan', allowedRoles)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const tenantId = await getScopedTenantId(request)

    const body = await request.json()
    const validated = updatePolicySchema.parse(body)

    const policy = await updateCompanyPolicy(tenantId, {
      ...validated,
      changedBy: session.user.id,
    })

    return NextResponse.json(policy)
  } catch (error) {
    if (error instanceof TenantMismatchError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Error updating company policy:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: (error as unknown as { errors: unknown }).errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar' },
      { status: 500 }
    )
  }
}

