import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth/session'
import { updateCompanyPolicy } from '@/lib/db/queries/empresa-configuracion'
import { z } from 'zod'

const updatePolicySchema = z.object({
  dailyLimit: z.number().positive().optional(),
  monthlyLimit: z.number().positive().optional(),
  subsidyPercentage: z.number().min(0).max(100).optional(),
  allowWeekends: z.boolean().optional(),
  allowHolidays: z.boolean().optional(),
  cutoffTime: z.string().optional(),
  cancellationDeadlineHours: z.number().optional(),
  penaltyForNoShow: z.number().optional(),
  penaltyForLateCancellation: z.number().optional(),
  allowDietaryPreferences: z.boolean().optional(),
  requiresManagerApproval: z.boolean().optional(),
  maxAdvanceOrderDays: z.number().optional(),
  minAdvanceOrderDays: z.number().optional(),
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

