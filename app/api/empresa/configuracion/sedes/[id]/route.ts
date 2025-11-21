/**
 * API Route: PATCH /api/empresa/configuracion/sedes/[id]
 * Actualizar sede existente
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const updateSiteSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).optional(),
  postalCode: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  deliveryInstructions: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar autenticación
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // 2. Verificar rol
    const allowedRoles = ['ADMIN_EMPRESA', 'RRHH']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
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
      return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
    }

    // 5. Validar datos
    const body = await request.json()
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
        deliveryInstructions: validated.deliveryInstructions || null,
      },
    })

    return NextResponse.json(site)
  } catch (error: any) {
    console.error('[UPDATE_SITE_ERROR]', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al actualizar sede' },
      { status: 500 }
    )
  }
}

