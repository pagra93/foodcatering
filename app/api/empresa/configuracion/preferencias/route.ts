import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getScopedTenantId } from '@/lib/auth/session'
import { updateCompanySettings } from '@/lib/db/queries/empresa-configuracion'
import { permittedAction } from '@/lib/auth/permissions'
import { z } from 'zod'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

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
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA']
    if (!permittedAction(session.user.permissions, session.user.role as string, 'emp-config:edit', allowedRoles)) {
      return apiError(403, 'Sin permisos')
    }

    const tenantId = await getScopedTenantId(request)

    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
    const validated = updateSettingsSchema.parse(body)

    const settings = await updateCompanySettings(tenantId, validated)

    return NextResponse.json(settings)
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'PATCH /api/empresa/configuracion/preferencias',
      requestId: requestIdFrom(request),
      fallback: 'Error al actualizar las preferencias',
    })
  }
}
