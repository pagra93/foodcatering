import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth/session'
import { updateCompanySettings } from '@/lib/db/queries/empresa-configuracion'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  notifyOnOrderConfirmed: z.boolean().optional(),
  notifyOnOrderDelivered: z.boolean().optional(),
  notifyOnIncident: z.boolean().optional(),
  notifyOnInvoice: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  monthlyReport: z.boolean().optional(),
  preferredLanguage: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
  fiscalDocRetention: z.number().min(4).max(10).optional(),
  autoApproveOrders: z.boolean().optional(),
  requirePhotoProof: z.boolean().optional(),
  allowEmployeeFeedback: z.boolean().optional(),
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

