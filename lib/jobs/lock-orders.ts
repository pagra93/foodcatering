import { prismaAdmin } from '@/lib/db/prisma-admin'
import { cutoffInstant, serviceDayFromDate } from '@/lib/orders/cutoff'
import type { JobSummary } from '@/lib/jobs/run'

/**
 * Job `lock-orders` (cada ~5 min): congela en BD los pedidos cuyo cutoff ya
 * pasó — CONFIRMED → LOCKED_AFTER_CUTOFF.
 *
 * Hasta ahora `LOCKED_AFTER_CUTOFF` se leía en 10 sitios pero NADIE lo
 * escribía: el bloqueo solo existía como comprobación al vuelo en el render.
 * Con el estado persistido, producción/entrega trabajan sobre pedidos
 * definitivos (sus queries aceptan CONFIRMED y LOCKED_AFTER_CUTOFF) y el
 * cierre deja de depender del reloj de cada render.
 *
 * Idempotente: la segunda pasada no encuentra CONFIRMED que bloquear.
 */
export async function lockOrdersJob(): Promise<JobSummary> {
  const now = new Date()
  const today = serviceDayFromDate(now) // día calendario en TZ de negocio
  const todayUtcMidnight = new Date(
    Date.UTC(today.year, today.month - 1, today.day)
  )

  // 1. Catch-up: cualquier CONFIRMED de días anteriores está, por definición,
  // pasado su cutoff (cubre caídas del cron o del servicio).
  const catchUp = await prismaAdmin.order.updateMany({
    where: {
      status: 'CONFIRMED',
      deletedAt: null,
      serviceDate: { lt: todayUtcMidnight },
    },
    data: { status: 'LOCKED_AFTER_CUTOFF', statusChangedAt: now },
  })

  // 2. Hoy: por empresa, solo si su cutoff (en TZ de negocio) ya pasó.
  const companies = await prismaAdmin.company.findMany({
    where: { tenant: { status: 'ACTIVE', deletedAt: null } },
    select: { tenantId: true, policy: { select: { cutoffTime: true } } },
  })

  const dueTenants: string[] = []
  for (const c of companies) {
    const cutoffTime = c.policy?.cutoffTime || '11:00'
    if (now.getTime() >= cutoffInstant(today, cutoffTime).getTime()) {
      dueTenants.push(c.tenantId)
    }
  }

  let lockedToday = 0
  if (dueTenants.length > 0) {
    const res = await prismaAdmin.order.updateMany({
      where: {
        status: 'CONFIRMED',
        deletedAt: null,
        serviceDate: todayUtcMidnight,
        tenantEmpresa: { in: dueTenants },
      },
      data: { status: 'LOCKED_AFTER_CUTOFF', statusChangedAt: now },
    })
    lockedToday = res.count
  }

  return {
    lockedPastDays: catchUp.count,
    lockedToday,
    companiesDue: dueTenants.length,
    companiesTotal: companies.length,
  }
}
