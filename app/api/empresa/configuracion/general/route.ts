import { type NextRequest, NextResponse } from 'next/server'
import {
  getRequiredSession,
  getScopedTenantId,
  TenantMismatchError,
} from '@/lib/auth/session'
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      throw new Error('Email RRHH inválido')
    }
    return val
  }),
  contactRrhhPhone: z.string().optional().nullable().transform(val => val === '' || !val ? null : val),
  contactFinanceName: z.string().optional().nullable().transform(val => val === '' || !val ? null : val),
  contactFinanceEmail: z.string().optional().nullable().transform(val => {
    if (!val || val === '') return null
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      throw new Error('Email Finanzas inválido')
    }
    return val
  }),
  contactFinancePhone: z.string().optional().nullable().transform(val => val === '' || !val ? null : val),
})

/**
 * PATCH /api/empresa/configuracion/general
 * Actualiza la información general de la empresa.
 *
 * El tenantId se resuelve con `getScopedTenantId`, que usa la sesión salvo que
 * un SUPER_ADMIN esté impersonando explícitamente otro tenant. Nunca se confía
 * en el header `x-tenant-id` para usuarios no super-admin (cierra el bypass
 * cross-tenant que había).
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
    const validated = updateGeneralSchema.parse(body)

    const company = await updateCompanyGeneral(tenantId, validated)

    return NextResponse.json(company)
  } catch (error) {
    if (error instanceof TenantMismatchError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Error updating company general:', error)

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
