/**
 * API: Menú Diario
 * GET /api/catering/menus/dia/[date] - Obtener menú del día
 * POST /api/catering/menus/dia/[date] - Actualizar/crear menú del día
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getDailyMenu, updateDailyMenu } from '@/lib/db/queries/catering-menus'
import { dailyMenuSchema, isAfterCutoff } from '@/lib/validations/menu'
import { ZodError } from 'zod'

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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const allowedRoles = [
      'ADMIN_CATERING',
      'CHEF',
      'COCINERO',
      'REPARTIDOR',
      'FINANZAS_CATERING',
    ]

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Parsear fecha
    const date = new Date(params.date)

    if (isNaN(date.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fecha inválida',
        },
        { status: 400 }
      )
    }

    // Obtener menú
    const menu = await getDailyMenu(session.user.tenantId, date)

    return NextResponse.json({
      success: true,
      data: menu,
    })
  } catch (error) {
    console.error('[DAILY_MENU_GET]', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener menú',
      },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos (solo ADMIN_CATERING y CHEF)
    const allowedRoles = ['ADMIN_CATERING', 'CHEF']

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Parsear fecha
    const date = new Date(params.date)

    if (isNaN(date.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fecha inválida',
        },
        { status: 400 }
      )
    }

    // Obtener cutoff del restaurant
    const restaurant = await prisma?.restaurant.findFirst({
      where: { tenantId: session.user.tenantId },
      select: { cutoffTime: true },
    })

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Restaurant no encontrado',
        },
        { status: 404 }
      )
    }

    // Verificar que no está después del cutoff (si es hoy)
    if (isAfterCutoff(date, restaurant.cutoffTime)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede modificar el menú después del cutoff',
        },
        { status: 403 }
      )
    }

    // Parsear body
    const body = await request.json()

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
    console.error('[DAILY_MENU_POST]', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('no existen o están inactivos')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar menú',
      },
      { status: 500 }
    )
  }
}

