/**
 * Operación diaria de un catering: menús publicados y pedidos por día de la
 * semana. Datos reales (DishSchedule + Order) — sustituye el mock con random.
 */

import { prisma } from '@/lib/db/prisma'
import { startOfDay, addDays } from 'date-fns'

export type DailyOperation = {
  date: Date
  starters: number
  mains: number
  desserts: number
  totalOrders: number
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function getCateringDailyOperations(
  tenantId: string,
  weekStart: Date
): Promise<DailyOperation[]> {
  const start = startOfDay(weekStart)
  const end = addDays(start, 7)

  const [schedules, ordersByDay] = await Promise.all([
    prisma.dishSchedule.findMany({
      where: {
        tenantId,
        status: 'PUBLISHED',
        date: { gte: start, lt: end },
      },
      select: { date: true, dish: { select: { course: true } } },
    }),
    // Conteo por día agregado en SQL — antes se traían TODOS los pedidos de
    // la semana a Node para contarlos por día en JS.
    prisma.order.groupBy({
      by: ['serviceDate'],
      where: {
        tenantCatering: tenantId,
        serviceDate: { gte: start, lt: end },
        deletedAt: null,
      },
      _count: { _all: true },
    }),
  ])

  // serviceDate es @db.Date → una fila por día.
  const ordersCountByDay = new Map(
    ordersByDay.map((o) => [dayKey(o.serviceDate), o._count._all])
  )

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    const key = dayKey(date)
    const daySchedules = schedules.filter((s) => dayKey(s.date) === key)
    return {
      date,
      starters: daySchedules.filter((s) => s.dish.course === 'FIRST').length,
      mains: daySchedules.filter((s) => s.dish.course === 'SECOND').length,
      desserts: daySchedules.filter((s) => s.dish.course === 'DESSERT').length,
      totalOrders: ordersCountByDay.get(key) ?? 0,
    }
  })
}
