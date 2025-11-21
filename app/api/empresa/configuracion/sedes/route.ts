/**
 * API Route: POST /api/empresa/configuracion/sedes
 * Crear nueva sede
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
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

    // 4. Buscar la empresa
    const company = await prisma.company.findUnique({
      where: { tenantId },
    })

    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    // 5. Validar datos
    const body = await request.json()
    const validated = createSiteSchema.parse(body)

    // 6. Crear sede
    const site = await prisma.companySite.create({
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

    return NextResponse.json(site, { status: 201 })
  } catch (error: any) {
    console.error('[CREATE_SITE_ERROR]', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al crear sede' },
      { status: 500 }
    )
  }
}

