/**
 * API para exportar facturación a diferentes formatos ERP
 * ♻️ Reutiliza lógica del portal de Admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant/get-tenant'
import { exportToERP, ERPFormat } from '@/lib/db/queries/empresa-facturacion'

export async function GET(request: NextRequest) {
  try {
    const { tenantId, tenantType } = await getTenant()

    if (!tenantId || tenantType !== 'EMPRESA') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener parámetros
    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const format = (searchParams.get('format') || 'GENERIC') as ERPFormat

    // Validar
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Parámetros inválidos' },
        { status: 400 }
      )
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
    console.error('Error al exportar:', error)
    return NextResponse.json(
      { error: 'Error al generar exportación' },
      { status: 500 }
    )
  }
}

