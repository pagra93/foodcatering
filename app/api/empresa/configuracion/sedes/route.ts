/**
 * API Route: POST /api/empresa/configuracion/sedes
 * Crear nueva sede
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { permittedAction } from '@/lib/auth/permissions'
import { getCompanyEntitlements, withinLimit } from '@/lib/plans/entitlements'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'
import { DomainError } from '@/lib/errors'
import { z } from 'zod'

const createSiteSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  city: z.string().min(2),
  postalCode: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  deliveryNotes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return apiError(401, 'No autenticado')

    const allowedRoles = ['ADMIN_EMPRESA', 'RRHH']
    if (!permittedAction(session.user.permissions, session.user.role, 'emp-config-site:create', allowedRoles)) {
      return apiError(403, 'Sin permisos')
    }

    const tenantId = session.user.tenantId

    const company = await prisma.company.findUnique({
      where: { tenantId },
    })
    if (!company) return apiError(404, 'Empresa no encontrada')

    const body = await request.json().catch(() => null)
    if (body === null) return apiError(400, 'Cuerpo JSON inválido')
    const validated = createSiteSchema.parse(body)

    // Cuota del plan validada DENTRO de la transacción con lock de la fila de
    // la empresa: dos altas simultáneas ya no pueden colarse por encima de
    // maxSites (check-then-act).
    const entitlements = await getCompanyEntitlements(tenantId)
    const site = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM companies WHERE id = ${company.id} FOR UPDATE`
      const siteCount = await tx.companySite.count({
        where: { tenantId, active: true },
      })
      if (!withinLimit(entitlements, 'maxSites', siteCount)) {
        throw new DomainError(
          `Has alcanzado el límite de sedes de tu plan (${entitlements.limits.maxSites}). Mejora tu plan para añadir más.`,
          403
        )
      }

      return tx.companySite.create({
        data: {
          tenantId,
          companyId: company.id,
          name: validated.name,
          address: validated.address,
          city: validated.city,
          postalCode: validated.postalCode || null,
          contactName: validated.contactName || null,
          contactPhone: validated.contactPhone || null,
          deliveryNotes: validated.deliveryNotes || null,
          active: true,
        },
      })
    })

    return NextResponse.json(site, { status: 201 })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'POST /api/empresa/configuracion/sedes',
      requestId: requestIdFrom(request),
      fallback: 'Error al crear sede',
    })
  }
}
