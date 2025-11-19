/**
 * API Route: Iniciar impersonación
 * POST /api/admin/impersonate/start
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/guards'
import { startImpersonation } from '@/lib/auth/impersonation'

const startSchema = z.object({
  userId: z.string().uuid(),
})

export async function POST(req: Request) {
  try {
    // 1. Verificar que sea super admin
    await requireSuperAdmin()
    
    // 2. Validar datos
    const body = await req.json()
    const { userId } = startSchema.parse(body)
    
    // 3. Iniciar impersonación
    const result = await startImpersonation(userId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
    // 4. Retornar token (el cliente debe guardarlo y usarlo en las siguientes requests)
    return NextResponse.json({
      success: true,
      token: result.token,
      message: 'Impersonación iniciada correctamente',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }
    
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json(
        { error: 'Solo super admins pueden impersonar' },
        { status: 403 }
      )
    }
    
    console.error('[API /admin/impersonate/start] Error:', error)
    return NextResponse.json(
      { error: 'Error al iniciar impersonación' },
      { status: 500 }
    )
  }
}

