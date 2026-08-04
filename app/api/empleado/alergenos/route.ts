/**
 * API Endpoint para Gestionar Alérgenos del Empleado
 * POST /api/empleado/alergenos - Actualizar alergias
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

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
    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Parsear y validar body
    const body = await req.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
    const validated = allergensSchema.parse(body)

    // Verificar que el empleado pertenece al usuario autenticado
    const { prisma } = await import('@/lib/db/prisma')
    const employee = await prisma.employee.findFirst({
      where: {
        id: validated.employeeId,
        userId: session.user.id,
        status: 'ACTIVE',
      },
    })

    if (!employee) {
      return apiError(403, 'No tienes permiso para actualizar este perfil')
    }

    // Actualizar alérgenos en dietPrefs (JSON)
    const currentEmployee = await prisma.employee.findUnique({
      where: { id: validated.employeeId },
      select: { dietPrefs: true },
    })

    const currentDietPrefs = (currentEmployee?.dietPrefs as Record<string, unknown>) || {}
    // Limpiar la clave legacy buggy si existiera.
    delete currentDietPrefs['allergens']

    await prisma.employee.update({
      where: { id: validated.employeeId },
      data: {
        dietPrefs: {
          ...currentDietPrefs,
          // Se guardan CÓDIGOS de alérgeno (catálogo Allergen.code).
          allergies: validated.allergens,
          blockAllergensEnabled: validated.blockEnabled,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Alérgenos actualizados correctamente',
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'POST /api/empleado/alergenos',
      requestId: requestIdFrom(req),
      fallback: 'Error al actualizar los alérgenos',
    })
  }
}
