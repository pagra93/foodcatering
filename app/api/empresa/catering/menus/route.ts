import { type NextRequest, NextResponse } from 'next/server'
import {
  getRequiredSession,
  getScopedTenantId,
  TenantMismatchError,
} from '@/lib/auth/session'
import { permittedAction } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { getWeeklyMenus } from '@/lib/db/queries/empresa-catering'

/**
 * GET /api/empresa/catering/menus
 * Menús semanales del catering asignado a la empresa.
 *
 * Blindado (M8): exige sesión + permiso `emp-catering:view`, resuelve el tenant
 * de la empresa con `getScopedTenantId`, y verifica que el `cateringId` pedido
 * esté realmente asignado a la empresa. Antes cualquier usuario autenticado podía
 * leer los menús de cualquier catering cambiando el parámetro `cateringId`.
 */
const VIEW_ROLES = [
  'SUPER_ADMIN',
  'ADMIN_EMPRESA',
  'RRHH',
  'FINANZAS',
  'MANAGER_SEDE',
  'EMPLEADO',
]

export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession()

    if (
      !permittedAction(
        session.user.permissions,
        session.user.role as string,
        'emp-catering:view',
        VIEW_ROLES
      )
    ) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const cateringId = searchParams.get('cateringId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!cateringId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const tenantId = await getScopedTenantId(request)

    // Verificar que el catering pedido está asignado a la empresa del usuario.
    const company = await prisma.company.findUnique({
      where: { tenantId },
      select: { id: true },
    })
    const assignment = company
      ? await prisma.companyCateringAssignment.findFirst({
          where: {
            companyId: company.id,
            tenantCatering: cateringId,
            active: true,
          },
          select: { id: true },
        })
      : null

    if (!assignment) {
      return NextResponse.json(
        { error: 'Catering no asignado a tu empresa' },
        { status: 403 }
      )
    }

    const menus = await getWeeklyMenus(
      cateringId,
      new Date(startDate),
      new Date(endDate)
    )

    return NextResponse.json(menus)
  } catch (error: any) {
    if (error instanceof TenantMismatchError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Error fetching menus:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener menús' },
      { status: 500 }
    )
  }
}
