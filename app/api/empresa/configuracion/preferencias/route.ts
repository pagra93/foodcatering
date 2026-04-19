import { type NextRequest, NextResponse } from 'next/server'
import { getRequiredSession, getScopedTenantId, TenantMismatchError } from '@/lib/auth/session'
import { updateCompanySettings } from '@/lib/db/queries/empresa-configuracion'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  deliveryLocation: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  notificationsEmail: z.array(z.string().email()).optional(),
  notifyDailySummary: z.boolean().optional(),
  notifyIncidents: z.boolean().optional(),
  notifyInvoices: z.boolean().optional(),
  notifyLowAdoption: z.boolean().optional(),
  defaultViewEmployees: z.string().optional(),
  defaultPeriodReports: z.string().optional(),
  alertCancellationRate: z.number().optional(),
  alertAdoptionRate: z.number().optional(),
  alertDeductibilityRate: z.number().optional(),
})

/**
 * PATCH /api/empresa/configuracion/preferencias
 * Actualizar preferencias de la empresa
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getRequiredSession()

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA']
    if (!allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const tenantId = await getScopedTenantId(request)

    const body = await request.json()
    const validated = updateSettingsSchema.parse(body)

    const settings = await updateCompanySettings(tenantId, validated)

    return NextResponse.json(settings)
  } catch (error) {
    if (error instanceof TenantMismatchError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Error updating company settings:', error)

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

