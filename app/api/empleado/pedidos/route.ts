/**
 * API Endpoint para Pedidos de Empleados
 * POST /api/empleado/pedidos - Crear o actualizar pedido
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/tenant/get-tenant'
import { createOrUpdateOrder } from '@/lib/db/queries/empleado-menus'
import { z } from 'zod'

// ============================================================================
// Schema de Validación
// ============================================================================

const orderSchema = z.object({
  employeeId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  selection: z.object({
    starterId: z.string().optional(),
    mainId: z.string(),
    dessertId: z.string().optional(),
  }),
})

// ============================================================================
// POST - Crear o actualizar pedido
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar tenant
    const { tenantId, tenantType } = await getTenant()
    if (tenantType !== 'EMPRESA') {
      return NextResponse.json(
        { error: 'Este endpoint solo está disponible para empresas' },
        { status: 403 }
      )
    }

    // Parsear y validar body
    const body = await req.json()
    const validated = orderSchema.parse(body)

    // Verificar que el empleado pertenece al usuario autenticado
    const { prisma } = await import('@/lib/db/prisma')
    const employee = await prisma.employee.findFirst({
      where: {
        id: validated.employeeId,
        userId: session.user.id,
        companyId: tenantId,
        active: true,
      },
    })

    if (!employee && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permiso para crear pedidos para este empleado' },
        { status: 403 }
      )
    }

    // Crear o actualizar pedido
    const order = await createOrUpdateOrder({
      employeeId: validated.employeeId,
      date: new Date(validated.date),
      selection: validated.selection,
    })

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        serviceDate: order.serviceDate,
        status: order.status,
        price: Number(order.price),
      },
    })
  } catch (error: any) {
    console.error('Error creating order:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Error al crear el pedido' },
      { status: 500 }
    )
  }
}

