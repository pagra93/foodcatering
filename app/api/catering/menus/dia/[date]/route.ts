/**
 * API: Menú Diario
 * GET /api/catering/menus/dia/[date] - Obtener menú del día
 * POST /api/catering/menus/dia/[date] - Actualizar/crear menú del día
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { getDailyMenu, updateDailyMenu } from '@/lib/db/queries/catering-menus'
import { dailyMenuSchema, isAfterCutoff } from '@/lib/validations/menu'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

type RouteContext = {
  params: {
    date: string
  }
}

/**
 * GET - Obtener menú de un día
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Verificar permisos
    const allowedRoles = [
      'ADMIN_CATERING',
      'CHEF',
      'COCINERO',
      'REPARTIDOR',
      'FINANZAS_CATERING',
    ]

    if (!permittedAction(session.user.permissions, session.user.role, 'menu:view', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    // Parsear fecha
    const date = new Date(params.date)

    if (isNaN(date.getTime())) {
      return apiError(400, 'Fecha inválida')
    }

    // Obtener menú
    const menu = await getDailyMenu(session.user.tenantId, date)

    return NextResponse.json({
      success: true,
      data: menu,
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'GET /api/catering/menus/dia/[date]',
      requestId: requestIdFrom(request),
      fallback: 'Error al obtener el menú',
    })
  }
}

/**
 * POST - Actualizar/crear menú de un día
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Verificar permisos (solo ADMIN_CATERING y CHEF)
    const allowedRoles = ['ADMIN_CATERING', 'CHEF']

    if (!permittedAction(session.user.permissions, session.user.role, 'menu:edit-day', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    // Parsear fecha
    const date = new Date(params.date)

    if (isNaN(date.getTime())) {
      return apiError(400, 'Fecha inválida')
    }

    // Obtener cutoff del restaurant
    const restaurant = await prisma?.restaurant.findFirst({
      where: { tenantId: session.user.tenantId },
      select: { cutoffTime: true },
    })

    if (!restaurant) {
      return apiError(404, 'Restaurant no encontrado')
    }

    // Verificar que no está después del cutoff (si es hoy)
    if (isAfterCutoff(date, restaurant.cutoffTime)) {
      return apiError(403, 'No se puede modificar el menú después del cutoff')
    }

    // Parsear body
    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }

    // Validar datos
    const validatedData = dailyMenuSchema.parse({
      ...body,
      date,
    })

    // Actualizar menú
    await updateDailyMenu(session.user.tenantId, validatedData)

    return NextResponse.json({
      success: true,
      message: 'Menú actualizado correctamente',
    })
  } catch (error) {
    // Mensaje de negocio conocido (lib/db/queries/catering-menus.ts#updateDailyMenu).
    if (error instanceof Error && error.message === 'Algunos platos no existen o están inactivos') {
      return apiError(400, error.message)
    }
    return apiErrorFrom(error, {
      route: 'POST /api/catering/menus/dia/[date]',
      requestId: requestIdFrom(request),
      fallback: 'Error al actualizar el menú',
    })
  }
}
