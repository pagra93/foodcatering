'use server'

/**
 * Valoración por plato del empleado (DishRating). El empleado puntúa cada plato
 * de un pedido ENTREGADO (1–5) + un comentario opcional del día.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequiredSession } from '@/lib/auth/session'
import { permittedAction } from '@/lib/auth/permissions'
import { dishesFromSelection } from '@/lib/db/queries/ratings'

type Result = { ok?: true; error?: string }

const schema = z.object({
  orderId: z.string().uuid(),
  comment: z.string().max(500).optional(),
  ratings: z
    .array(
      z.object({
        dishId: z.string().uuid(),
        course: z.enum(['FIRST', 'SECOND', 'DESSERT']),
        rating: z.number().int().min(1).max(5),
      })
    )
    .min(1, 'Valora al menos un plato'),
})

export async function rateDishesAction(input: unknown): Promise<Result> {
  const session = await getRequiredSession()

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  if (
    !permittedAction(
      session.user.permissions,
      session.user.role,
      'emp-rating-own:create',
      ['EMPLEADO']
    )
  ) {
    return { error: 'No tienes permiso para valorar.' }
  }

  // El empleado del usuario (scope propio).
  const employee = await prisma.employee.findFirst({
    where: {
      userId: session.user.id,
      tenantId: session.user.tenantId ?? undefined,
      status: 'ACTIVE',
    },
    select: { id: true },
  })
  if (!employee) return { error: 'No eres empleado.' }

  // El pedido debe ser suyo y estar ENTREGADO.
  const order = await prisma.order.findFirst({
    where: {
      id: parsed.data.orderId,
      employeeId: employee.id,
      status: 'DELIVERED',
    },
    select: {
      id: true,
      selection: true,
      tenantCatering: true,
      tenantEmpresa: true,
      serviceDate: true,
    },
  })
  if (!order) return { error: 'Pedido no válido para valorar.' }

  // Solo se aceptan platos que están en la selección del pedido.
  const validCourseByDish = new Map(
    dishesFromSelection(order.selection).map((d) => [d.dishId, d.course])
  )
  const items = parsed.data.ratings.filter((r) => validCourseByDish.has(r.dishId))
  if (items.length === 0) return { error: 'Ningún plato válido para valorar.' }

  // El comentario del día se guarda en el segundo plato (o el primero disponible).
  const comment = parsed.data.comment?.trim() || null
  const commentDishId =
    items.find((r) => r.course === 'SECOND')?.dishId ?? items[0]!.dishId

  for (const r of items) {
    const dishComment = r.dishId === commentDishId ? comment : null
    await prisma.dishRating.upsert({
      where: { orderId_dishId: { orderId: order.id, dishId: r.dishId } },
      create: {
        orderId: order.id,
        dishId: r.dishId,
        course: r.course,
        employeeId: employee.id,
        tenantCatering: order.tenantCatering,
        tenantEmpresa: order.tenantEmpresa,
        serviceDate: order.serviceDate,
        rating: r.rating,
        comment: dishComment,
      },
      update: { rating: r.rating, comment: dishComment },
    })
  }

  revalidatePath('/empleado/historial')
  revalidatePath('/empleado/menus')
  return { ok: true }
}
