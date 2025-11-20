import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth/session'
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
    const validated = updateSettingsSchema.parse(body)

    const settings = await updateCompanySettings(tenantId, validated)

    return NextResponse.json(settings)
  } catch (error: any) {
    console.error('Error updating company settings:', error)

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

