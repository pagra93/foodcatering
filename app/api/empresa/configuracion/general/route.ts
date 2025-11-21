import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth/session'
import { updateCompanyGeneral } from '@/lib/db/queries/empresa-configuracion'
import { z } from 'zod'

const updateGeneralSchema = z.object({
  // Campos del modelo Company
  legalName: z.string().min(2).optional(),
  cif: z.string().min(9).optional(),
  billingAddress: z.string().optional(),
  sector: z.string().optional().nullable().transform(val => val === '' || !val ? null : val),
  employeeCount: z.coerce.number().optional().nullable(),
  contactRrhhName: z.string().optional().nullable().transform(val => val === '' || !val ? null : val),
  contactRrhhEmail: z.string().optional().nullable().transform(val => {
    if (!val || val === '') return null
    // Validar email solo si no está vacío
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      throw new Error('Email RRHH inválido')
    }
    return val
  }),
  contactRrhhPhone: z.string().optional().nullable().transform(val => val === '' || !val ? null : val),
  contactFinanceName: z.string().optional().nullable().transform(val => val === '' || !val ? null : val),
  contactFinanceEmail: z.string().optional().nullable().transform(val => {
    if (!val || val === '') return null
    // Validar email solo si no está vacío
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      throw new Error('Email Finanzas inválido')
    }
    return val
  }),
  contactFinancePhone: z.string().optional().nullable().transform(val => val === '' || !val ? null : val),
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

