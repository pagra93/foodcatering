import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getScopedTenantId } from '@/lib/auth/session'
import { updateCompanyPolicy } from '@/lib/db/queries/empresa-configuracion'
import { permittedAction } from '@/lib/auth/permissions'
import { z } from 'zod'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

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
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA']
    if (!permittedAction(session.user.permissions, session.user.role as string, 'emp-config:edit-plan', allowedRoles)) {
      return apiError(403, 'Sin permisos')
    }

    const tenantId = await getScopedTenantId(request)

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
    const validated = updatePolicySchema.parse(body)

    const policy = await updateCompanyPolicy(tenantId, {
      ...validated,
      changedBy: session.user.id,
    })

    return NextResponse.json(policy)
  } catch (error) {
    // Mensaje de negocio conocido (lib/db/queries/empresa-configuracion.ts#updateCompanyPolicy).
    if (error instanceof Error && error.message === 'Company policy not found') {
      return apiError(404, 'Política de la empresa no encontrada')
    }
    return apiErrorFrom(error, {
      route: 'PATCH /api/empresa/configuracion/plan',
      requestId: requestIdFrom(request),
      fallback: 'Error al actualizar la política de la empresa',
    })
  }
}
