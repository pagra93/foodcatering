import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth/session'
import { updateCompanyGeneral } from '@/lib/db/queries/empresa-configuracion'
import { z } from 'zod'

const updateGeneralSchema = z.object({
  legalName: z.string().min(2).optional(),
  cif: z.string().min(9).optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional().or(z.literal('')),
  sector: z.string().optional(),
  employeeCount: z.number().optional(),
  contactRrhhName: z.string().optional(),
  contactRrhhEmail: z.string().email().optional().or(z.literal('')),
  contactRrhhPhone: z.string().optional(),
  contactFinanceName: z.string().optional(),
  contactFinanceEmail: z.string().email().optional().or(z.literal('')),
  contactFinancePhone: z.string().optional(),
})

/**
 * PATCH /api/empresa/configuracion/general
 * Actualizar información general de la empresa
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
    const validated = updateGeneralSchema.parse(body)

    const company = await updateCompanyGeneral(tenantId, validated)

    return NextResponse.json(company)
  } catch (error: any) {
    console.error('Error updating company general:', error)

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

