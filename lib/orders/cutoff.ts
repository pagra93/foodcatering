/**
 * Cutoff de pedidos — cálculo en la zona horaria del NEGOCIO, no del servidor.
 *
 * El contenedor puede correr en UTC; sin esto, un cutoff de las 11:00 se
 * evaluaría a las 13:00 de Madrid en verano (se podría cancelar comida ya
 * producida y en ruta). El soporte multi-TZ por tenant (Tenant.timezone) queda
 * para una fase posterior: aquí se fija Europe/Madrid como TZ de negocio.
 */

export const BUSINESS_TIME_ZONE = 'Europe/Madrid'

export type ServiceDay = { year: number; month: number; day: number }

export function parseCutoffTime(cutoff: string): { hours: number; minutes: number } {
  const [hStr, mStr] = cutoff.split(':')
  const hours = hStr ? Number(hStr) : 11
  const minutes = mStr ? Number(mStr) : 0
  return {
    hours: Number.isFinite(hours) ? hours : 11,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  }
}

/** Offset (ms) de una zona IANA respecto a UTC en un instante dado. */
function tzOffsetMs(timeZone: string, utcInstant: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = dtf.formatToParts(utcInstant)
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0)
  const hour = get('hour')
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour === 24 ? 0 : hour,
    get('minute'),
    get('second')
  )
  return asUtc - utcInstant.getTime()
}

/** Día calendario de un instante en una zona horaria. */
function dayInTimeZone(instant: Date, timeZone: string): ServiceDay {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
  const [year, month, day] = formatted.split('-').map(Number)
  return { year: year ?? 1970, month: month ?? 1, day: day ?? 1 }
}

/**
 * Día de servicio de un Date.
 * - Los `@db.Date` de Prisma y los strings 'YYYY-MM-DD' llegan como medianoche
 *   UTC → se leen las partes UTC (el día tal cual viaja en BD/API).
 * - Un Date con componente horaria se interpreta en la TZ del negocio.
 */
export function serviceDayFromDate(
  d: Date,
  timeZone: string = BUSINESS_TIME_ZONE
): ServiceDay {
  const isUtcMidnight =
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  if (isUtcMidnight) {
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
    }
  }
  return dayInTimeZone(d, timeZone)
}

/** Instante UTC en el que corta el cutoff de un día de servicio. */
export function cutoffInstant(
  day: ServiceDay,
  cutoffTime: string,
  timeZone: string = BUSINESS_TIME_ZONE
): Date {
  const { hours, minutes } = parseCutoffTime(cutoffTime)
  const naiveUtc = Date.UTC(day.year, day.month - 1, day.day, hours, minutes, 0, 0)
  // Doble pasada para clavar el offset junto a los cambios de hora (DST).
  const first = tzOffsetMs(timeZone, new Date(naiveUtc))
  const second = tzOffsetMs(timeZone, new Date(naiveUtc - first))
  return new Date(naiveUtc - second)
}

/** true si `now` ya pasó el cutoff del día de servicio. */
export function isPastCutoff(
  day: ServiceDay,
  cutoffTime: string,
  now: Date = new Date(),
  timeZone: string = BUSINESS_TIME_ZONE
): boolean {
  return now.getTime() > cutoffInstant(day, cutoffTime, timeZone).getTime()
}
