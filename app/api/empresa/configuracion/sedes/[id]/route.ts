/**
 * API Route: PATCH /api/empresa/configuracion/sedes/[id]
 * Actualizar sede existente
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { permittedAction } from '@/lib/auth/permissions'
import { z } from 'zod'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

const updateSiteSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).optional(),
  postalCode: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  deliveryNotes: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar autenticación
    const session = await auth()
    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // 2. Verificar rol
    const allowedRoles = ['ADMIN_EMPRESA', 'RRHH']
    if (!permittedAction(session.user.permissions, session.user.role, 'emp-config-site:edit', allowedRoles)) {
      return apiError(403, 'Sin permisos')
    }

    // 3. Obtener tenantId
    const tenantId = session.user.tenantId

    // 4. Verificar que la sede pertenece a este tenant
    const existingSite = await prisma.companySite.findFirst({
      where: {
        id: params.id,
        tenantId,
      },
    })

    if (!existingSite) {
      return apiError(404, 'Sede no encontrada')
    }

    // 5. Validar datos
    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
    const validated = updateSiteSchema.parse(body)

    // 6. Actualizar sede
    const site = await prisma.companySite.update({
      where: { id: params.id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.address && { address: validated.address }),
        ...(validated.city && { city: validated.city }),
        postalCode: validated.postalCode || null,
        contactName: validated.contactName || null,
        contactPhone: validated.contactPhone || null,
        deliveryNotes: validated.deliveryNotes || null,
      },
    })

    return NextResponse.json(site)
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'PATCH /api/empresa/configuracion/sedes/[id]',
      requestId: requestIdFrom(request),
      fallback: 'Error al actualizar la sede',
    })
  }
}

