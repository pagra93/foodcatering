import { describe, it, expect } from 'vitest'
import {
  cutoffInstant,
  isPastCutoff,
  parseCutoffTime,
  serviceDayFromDate,
} from '@/lib/orders/cutoff'

/**
 * Todos los asserts usan instantes UTC explícitos y la TZ va como parámetro
 * interno (Intl), así que el resultado es idéntico corra donde corra el runner
 * (CI en UTC, laptop en Madrid…). Es la regresión del bug "cutoff en TZ del
 * servidor": con la lógica antigua (setHours local), en un server UTC el corte
 * de las 11:00 se movía a las 13:00 de Madrid en verano.
 */
describe('cutoff en TZ de negocio (Europe/Madrid)', () => {
  it('parsea HH:mm y HH:mm:ss con fallback a 11:00', () => {
    expect(parseCutoffTime('11:00')).toEqual({ hours: 11, minutes: 0 })
    expect(parseCutoffTime('09:30:00')).toEqual({ hours: 9, minutes: 30 })
    expect(parseCutoffTime('11:00:00')).toEqual({ hours: 11, minutes: 0 })
    expect(parseCutoffTime('basura')).toEqual({ hours: 11, minutes: 0 })
  })

  it('verano (CEST, UTC+2): las 11:00 de Madrid son las 09:00Z', () => {
    expect(
      cutoffInstant({ year: 2026, month: 8, day: 4 }, '11:00').toISOString()
    ).toBe('2026-08-04T09:00:00.000Z')
  })

  it('invierno (CET, UTC+1): las 11:00 de Madrid son las 10:00Z', () => {
    expect(
      cutoffInstant({ year: 2026, month: 12, day: 1 }, '11:00').toISOString()
    ).toBe('2026-12-01T10:00:00.000Z')
  })

  it('borde: a las 10:59 de Madrid se puede pedir, a las 11:01 no', () => {
    const day = { year: 2026, month: 8, day: 4 }
    // 08:59Z = 10:59 en Madrid (verano)
    expect(isPastCutoff(day, '11:00', new Date('2026-08-04T08:59:00Z'))).toBe(false)
    // 09:01Z = 11:01 en Madrid
    expect(isPastCutoff(day, '11:00', new Date('2026-08-04T09:01:00Z'))).toBe(true)
  })

  it('serviceDayFromDate lee partes UTC de fechas @db.Date / "YYYY-MM-DD"', () => {
    expect(serviceDayFromDate(new Date('2026-08-04'))).toEqual({
      year: 2026,
      month: 8,
      day: 4,
    })
    expect(serviceDayFromDate(new Date('2026-08-04T00:00:00.000Z'))).toEqual({
      year: 2026,
      month: 8,
      day: 4,
    })
  })

  it('serviceDayFromDate interpreta instantes con hora en la TZ de negocio', () => {
    // 2026-08-03T23:30Z = 2026-08-04 01:30 en Madrid → día 4
    expect(serviceDayFromDate(new Date('2026-08-03T23:30:00Z'))).toEqual({
      year: 2026,
      month: 8,
      day: 4,
    })
  })
})
