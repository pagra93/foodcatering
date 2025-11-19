/**
 * API Route: Terminar impersonación
 * POST /api/admin/impersonate/stop
 */

import { NextResponse } from 'next/server'
import { stopImpersonation } from '@/lib/auth/impersonation'
import { requireAuth } from '@/lib/guards'

export async function POST(req: Request) {
  try {
    // 1. Verificar autenticación
    await requireAuth()
    
    // 2. Terminar impersonación
    const result = await stopImpersonation()
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Impersonación terminada correctamente',
    })
  } catch (error) {
    console.error('[API /admin/impersonate/stop] Error:', error)
    return NextResponse.json(
      { error: 'Error al terminar impersonación' },
      { status: 500 }
    )
  }
}

