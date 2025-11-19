/**
 * API Endpoint para Cambiar Contraseña del Empleado
 * POST /api/empleado/cambiar-password
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/tenant/get-tenant'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// ============================================================================
// Schema de Validación
// ============================================================================

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
    .regex(/[a-zA-Z]/, 'La contraseña debe contener al menos una letra'),
})

// ============================================================================
// POST - Cambiar contraseña
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
    const validated = changePasswordSchema.parse(body)

    // Obtener usuario actual
    const { prisma } = await import('@/lib/db/prisma')
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true,
      },
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o sin contraseña configurada' },
        { status: 404 }
      )
    }

    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(
      validated.currentPassword,
      user.password
    )

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'La contraseña actual es incorrecta' },
        { status: 400 }
      )
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(validated.newPassword, 10)

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    })
  } catch (error: any) {
    console.error('Error changing password:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Error al cambiar la contraseña' },
      { status: 500 }
    )
  }
}

