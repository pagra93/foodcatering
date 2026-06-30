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

  const [schedules, orders] = await Promise.all([
    prisma.dishSchedule.findMany({
      where: {
        tenantId,
        status: 'PUBLISHED',
        date: { gte: start, lt: end },
      },
      select: { date: true, dish: { select: { course: true } } },
    }),
    prisma.order.findMany({
      where: {
        tenantCatering: tenantId,
        serviceDate: { gte: start, lt: end },
        deletedAt: null,
      },
      select: { serviceDate: true },
    }),
  ])

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    const key = dayKey(date)
    const daySchedules = schedules.filter((s) => dayKey(s.date) === key)
    return {
      date,
      starters: daySchedules.filter((s) => s.dish.course === 'FIRST').length,
      mains: daySchedules.filter((s) => s.dish.course === 'SECOND').length,
      desserts: daySchedules.filter((s) => s.dish.course === 'DESSERT').length,
      totalOrders: orders.filter((o) => dayKey(o.serviceDate) === key).length,
    }
  })
}
