/**
 * API Endpoint para Pedidos de Empleados
 * POST /api/empleado/pedidos - Crear o actualizar pedido
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { prisma } from '@/lib/db/prisma'
import { createOrUpdateOrder } from '@/lib/db/queries/empleado-menus'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'
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
    const session = await auth()
    if (!session?.user) return apiError(401, 'No autenticado')

    // El tenant sale SIEMPRE de la sesión (JWT firmado), nunca de cabeceras:
    // la antigua lectura de `x-tenant-id` era manipulable y además el
    // middleware ni siquiera la inyecta en /api (la ruta devolvía 500).
    if (session.user.tenantType !== 'EMPRESA') {
      return apiError(403, 'Este endpoint solo está disponible para empresas')
    }

    const body = await req.json().catch(() => null)
    if (body === null) return apiError(400, 'Cuerpo JSON inválido')
    const validated = orderSchema.parse(body)

    // El empleado debe pertenecer al usuario autenticado y a su tenant
    const employee = await prisma.employee.findFirst({
      where: {
        id: validated.employeeId,
        userId: session.user.id,
        tenantId: session.user.tenantId,
        status: 'ACTIVE',
      },
    })

    if (!employee && session.user.role !== 'SUPER_ADMIN') {
      return apiError(403, 'No tienes permiso para crear pedidos para este empleado')
    }

    const order = await createOrUpdateOrder({
      employeeId: validated.employeeId,
      date: new Date(validated.date),
      selection: validated.selection,
    })

    // Best-effort tras el éxito: logAudit nunca rompe el flujo.
    await logAudit({
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      action: order.version > 1 ? 'UPDATE' : 'CREATE',
      entity: 'Order',
      entityId: order.id,
      diff: {
        after: {
          serviceDate: order.serviceDate.toISOString(),
          price: Number(order.price),
          version: order.version,
        },
      },
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
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'POST /api/empleado/pedidos',
      requestId: requestIdFrom(req),
      fallback: 'Error al guardar el pedido',
    })
  }
}
