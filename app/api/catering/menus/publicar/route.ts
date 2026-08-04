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
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Verificar permisos (solo ADMIN_CATERING y CHEF)
    const allowedRoles = ['ADMIN_CATERING', 'CHEF']

    if (!permittedAction(session.user.permissions, session.user.role, 'menu:publish', allowedRoles)) {
      return apiError(403, 'Acceso denegado')
    }

    // Parsear body
    const body = await request.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }

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
    // Mensaje de negocio conocido (lib/db/queries/catering-menus.ts#publishWeeklyMenu).
    if (
      error instanceof Error &&
      error.message.startsWith('Los siguientes días no tienen primeros y segundos')
    ) {
      return apiError(400, error.message)
    }
    return apiErrorFrom(error, {
      route: 'POST /api/catering/menus/publicar',
      requestId: requestIdFrom(request),
      fallback: 'Error al publicar los menús',
    })
  }
}
