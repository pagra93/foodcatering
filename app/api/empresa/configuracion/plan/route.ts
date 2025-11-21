import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth/session'
import { updateCompanyPolicy } from '@/lib/db/queries/empresa-configuracion'
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
    const tenantId = request.headers.get('x-tenant-id')

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID missing' }, { status: 400 })
    }

    // Verificar permisos
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA']
    if (!allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const validated = updatePolicySchema.parse(body)

    const policy = await updateCompanyPolicy(tenantId, {
      ...validated,
      changedBy: session.user.id,
    })

    return NextResponse.json(policy)
  } catch (error: any) {
    console.error('Error updating company policy:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Error al actualizar' },
      { status: 500 }
    )
  }
}

