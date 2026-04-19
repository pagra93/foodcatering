/**
 * Queries para los 5 sub-módulos de catálogos.
 * Agrupados por módulo para claridad.
 */

import { prisma } from '@/lib/db/prisma'

// ─── Alérgenos ─────────────────────────────────────────────────────────

export async function getAllAllergens(includeInactive = false) {
  return prisma.allergen.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: 'asc' },
  })
}

// ─── Festivos ──────────────────────────────────────────────────────────

export async function getOfficialHolidays(year?: number) {
  return prisma.holiday.findMany({
    where: {
      scope: { in: ['NATIONAL', 'REGION'] },
      ...(year && {
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      }),
    },
    orderBy: { date: 'asc' },
  })
}

export async function getTenantHolidays(tenantId: string, year?: number) {
  return prisma.holiday.findMany({
    where: {
      scope: 'TENANT',
      tenantId,
      ...(year && {
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      }),
    },
    orderBy: { date: 'asc' },
  })
}

export async function getTenantHolidayOverrides(tenantId: string) {
  return prisma.holidayOverride.findMany({
    where: { tenantId },
  })
}

/**
 * Calendario EFECTIVO de festivos para un tenant:
 *  - Festivos oficiales (NATIONAL + REGION) NO desactivados.
 *  - + Festivos TENANT propios.
 */
export async function getEffectiveHolidays(
  tenantId: string,
  year: number
): Promise<Date[]> {
  const [officials, tenantHolidays, overrides] = await Promise.all([
    getOfficialHolidays(year),
    getTenantHolidays(tenantId, year),
    getTenantHolidayOverrides(tenantId),
  ])

  const overrideIds = new Set(
    overrides.filter((o) => o.disabled).map((o) => o.holidayId)
  )
  const effectiveOfficials = officials.filter((h) => !overrideIds.has(h.id))

  const allDates = [
    ...effectiveOfficials.map((h) => h.date),
    ...tenantHolidays.map((h) => h.date),
  ]

  // Deduplicar por ISO string
  const unique = Array.from(
    new Map(allDates.map((d) => [d.toISOString(), d])).values()
  )
  return unique.sort((a, b) => a.getTime() - b.getTime())
}

/**
 * Helper crítico: ¿es día hábil para este tenant?
 * Excluye fines de semana (sábado/domingo) y festivos efectivos.
 */
export async function isBusinessDay(
  tenantId: string,
  date: Date
): Promise<boolean> {
  const day = date.getDay()
  if (day === 0 || day === 6) return false // domingo/sábado

  const iso = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  ).toISOString()

  const holidays = await getEffectiveHolidays(tenantId, date.getFullYear())
  const isHoliday = holidays.some(
    (h) =>
      new Date(
        Date.UTC(h.getFullYear(), h.getMonth(), h.getDate())
      ).toISOString() === iso
  )
  return !isHoliday
}

// ─── Motivos de incidencia ─────────────────────────────────────────────

export async function getIncidentReasons(tenantId?: string | null) {
  return prisma.incidentReason.findMany({
    where: {
      active: true,
      OR: [
        { scope: 'SYSTEM' },
        ...(tenantId ? [{ scope: 'TENANT' as const, tenantId }] : []),
      ],
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
}

// ─── Plantillas de menú ────────────────────────────────────────────────

export async function getMenuTemplatesForCatering(tenantCatering: string) {
  return prisma.menuTemplate.findMany({
    where: { tenantCatering, active: true },
    orderBy: { name: 'asc' },
  })
}

// ─── Zonas de reparto ──────────────────────────────────────────────────

export async function getDeliveryZonesForCatering(tenantCatering: string) {
  return prisma.deliveryZone.findMany({
    where: { tenantCatering },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  })
}

/**
 * Busca el catering que cubre un código postal concreto.
 */
export async function findCateringsCoveringPostalCode(cp: string) {
  return prisma.deliveryZone.findMany({
    where: { postalCodes: { has: cp }, active: true },
    select: { tenantCatering: true, name: true },
  })
}
