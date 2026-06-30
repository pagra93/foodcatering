/**
 * API: Publicar Menús
 * POST /api/catering/menus/publicar
 * 
 * Publica menús de un rango de fechas (los hace visibles a empleados)
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { permittedAction } from '@/lib/auth/permissions'
import { publishWeeklyMenu } from '@/lib/db/queries/catering-menus'
import { publishMenusSchema } from '@/lib/validations/menu'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos (solo ADMIN_CATERING y CHEF)
    const allowedRoles = ['ADMIN_CATERING', 'CHEF']

    if (!permittedAction(session.user.permissions, session.user.role, 'menu:publish', allowedRoles)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Parsear body
    const body = await request.json()

    // Validar datos
    const validatedData = publishMenusSchema.parse({
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    })

    // Publicar menús
    const result = await publishWeeklyMenu(session.user.tenantId, validatedData)

    return NextResponse.json({
      success: true,
      message: `${result.count} menús publicados correctamente`,
      data: result,
    })
  } catch (error) {
    console.error('[PUBLISH_MENUS_POST]', error)

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
      if (error.message.includes('no tienen primeros y segundos')) {
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
        error: 'Error al publicar menús',
      },
      { status: 500 }
    )
  }
}

