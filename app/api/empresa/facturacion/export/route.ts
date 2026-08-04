/**
 * API para exportar facturación a diferentes formatos ERP
 * ♻️ Reutiliza lógica del portal de Admin
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getScopedTenantId } from '@/lib/auth/session'
import { permittedAction } from '@/lib/auth/permissions'
import { exportRateLimiter } from '@/lib/ratelimit'
import { exportToERP, type ERPFormat } from '@/lib/db/queries/empresa-facturacion'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

/**
 * GET /api/empresa/facturacion/export
 * Exporta la facturación de la empresa a formato ERP (CSV).
 *
 * Blindado (C2): exige sesión, permiso `emp-billing:export`, y resuelve el
 * tenant con `getScopedTenantId` (que valida el header `x-tenant-id` contra la
 * sesión). Antes la ruta derivaba el tenant del header sin autenticar, lo que
 * permitía exportar la facturación de cualquier empresa sin estar logueado.
 *
 * TODO (M12): añadir el candado de feature de plan `data-export`
 * (getCompanyEntitlements + companyHasFeature) cuando se aborde esa ficha.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'FINANZAS']
    if (
      !permittedAction(
        session.user.permissions,
        session.user.role as string,
        'emp-billing:export',
        allowedRoles
      )
    ) {
      return apiError(403, 'Sin permisos')
    }

    const tenantId = await getScopedTenantId(request)

    // Rate limit: 10 exports/h por tenant
    const rl = await exportRateLimiter.check(`export:billing:${tenantId}`)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Demasiados exports, espera un momento' },
        { status: 429, headers: { 'Retry-After': String(rl.resetIn) } }
      )
    }

    // Obtener parámetros
    const searchParams = request.nextUrl.searchParams
    const year = parseInt(
      searchParams.get('year') || String(new Date().getFullYear())
    )
    const month = parseInt(
      searchParams.get('month') || String(new Date().getMonth() + 1)
    )
    const format = (searchParams.get('format') || 'GENERIC') as ERPFormat

    // Validar
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return apiError(400, 'Parámetros inválidos')
    }

    // Generar export
    const { content, filename } = await exportToERP(tenantId, year, month, format)

    // Retornar CSV como descarga
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'GET /api/empresa/facturacion/export',
      requestId: requestIdFrom(request),
      fallback: 'Error al generar la exportación',
    })
  }
}
