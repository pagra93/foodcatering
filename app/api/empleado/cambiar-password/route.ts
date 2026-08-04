/**
 * API Endpoint para Cambiar Contraseña del Empleado
 * POST /api/empleado/cambiar-password
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { prisma } from '@/lib/db/prisma'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { BCRYPT_COST } from '@/lib/auth/password'

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
    const session = await auth()
    if (!session?.user) return apiError(401, 'No autenticado')

    // Tenant desde la sesión (la cabecera x-tenant-id ni llega a /api ni es
    // de fiar). Solo usuarios de tenant EMPRESA usan este endpoint.
    if (session.user.tenantType !== 'EMPRESA') {
      return apiError(403, 'Este endpoint solo está disponible para empresas')
    }

    const body = await req.json().catch(() => null)
    if (body === null) return apiError(400, 'Cuerpo JSON inválido')
    const validated = changePasswordSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        passwordHash: true,
      },
    })

    if (!user || !user.passwordHash) {
      return apiError(404, 'Usuario no encontrado o sin contraseña configurada')
    }

    const isPasswordValid = await bcrypt.compare(
      validated.currentPassword,
      user.passwordHash
    )

    if (!isPasswordValid) {
      return apiError(400, 'La contraseña actual es incorrecta')
    }

    const hashedPassword = await bcrypt.hash(validated.newPassword, BCRYPT_COST)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        // tokenVersion++ invalida las demás sesiones activas (H7).
        tokenVersion: { increment: 1 },
      },
    })

    // Best-effort tras el éxito: rastro del cambio de credenciales sin datos
    // sensibles (ni contraseñas ni hashes en el diff).
    await logAudit({
      tenantId: session.user.tenantId,
      actorId: user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      diff: { after: { passwordChanged: true, via: 'change' } },
    })

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'POST /api/empleado/cambiar-password',
      requestId: requestIdFrom(req),
      fallback: 'Error al cambiar la contraseña',
    })
  }
}
