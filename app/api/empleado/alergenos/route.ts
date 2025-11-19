/**
 * API Endpoint para Gestionar Alérgenos del Empleado
 * POST /api/empleado/alergenos - Actualizar alergias
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/tenant/get-tenant'
import { z } from 'zod'

// ============================================================================
// Schema de Validación
// ============================================================================

const allergensSchema = z.object({
  employeeId: z.string(),
  allergens: z.array(z.string()),
  blockEnabled: z.boolean(),
})

// ============================================================================
// POST - Actualizar alérgenos
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar tenant
    const { tenantId, tenantType } = await getTenant()
    if (tenantType !== 'EMPRESA') {
      return NextResponse.json(
        { error: 'Este endpoint solo está disponible para empresas' },
        { status: 403 }
      )
    }

    // Parsear y validar body
    const body = await req.json()
    const validated = allergensSchema.parse(body)

    // Verificar que el empleado pertenece al usuario autenticado
    const { prisma } = await import('@/lib/db/prisma')
    const employee = await prisma.employee.findFirst({
      where: {
        id: validated.employeeId,
        userId: session.user.id,
        companyId: tenantId,
        active: true,
      },
    })

    if (!employee && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permiso para actualizar este perfil' },
        { status: 403 }
      )
    }

    // Actualizar alérgenos
    await prisma.employee.update({
      where: { id: validated.employeeId },
      data: {
        allergens: validated.allergens,
        blockAllergensEnabled: validated.blockEnabled,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Alérgenos actualizados correctamente',
    })
  } catch (error: any) {
    console.error('Error updating allergens:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Error al actualizar los alérgenos' },
      { status: 500 }
    )
  }
}

