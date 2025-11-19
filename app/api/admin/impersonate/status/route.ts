/**
 * API Route: Estado de impersonación
 * GET /api/admin/impersonate/status
 */

import { NextResponse } from 'next/server'
import { getImpersonationInfo } from '@/lib/auth/impersonation'
import { requireAuth } from '@/lib/guards'

export async function GET(req: Request) {
  try {
    // Verificar autenticación
    await requireAuth()
    
    // Obtener información de impersonación
    const info = await getImpersonationInfo()
    
    return NextResponse.json(info)
  } catch (error) {
    console.error('[API /admin/impersonate/status] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener estado de impersonación' },
      { status: 500 }
    )
  }
}

