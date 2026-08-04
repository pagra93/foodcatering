import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getScopedTenantId } from '@/lib/auth/session'
import { updateCompanyGeneral } from '@/lib/db/queries/empresa-configuracion'
import { permittedAction } from '@/lib/auth/permissions'
import { z } from 'zod'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

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
    const validated = updateGeneralSchema.parse(body)

    const company = await updateCompanyGeneral(tenantId, validated)

    return NextResponse.json(company)
  } catch (error) {
    // Mensajes de negocio conocidos (transforms del schema updateGeneralSchema).
    if (error instanceof Error && error.message === 'Email RRHH inválido') {
      return apiError(400, error.message)
    }
    if (error instanceof Error && error.message === 'Email Finanzas inválido') {
      return apiError(400, error.message)
    }
    return apiErrorFrom(error, {
      route: 'PATCH /api/empresa/configuracion/general',
      requestId: requestIdFrom(request),
      fallback: 'Error al actualizar la información de la empresa',
    })
  }
}
