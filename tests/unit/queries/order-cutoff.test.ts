/**
 * Suite: lógica del cutoff diario.
 *
 * El cutoff es la hora (formato "HH:mm") después de la cual los pedidos del día
 * quedan bloqueados. Verificamos el parseo y el comportamiento de comparación.
 *
 * No tocamos la BD aquí — el test es sobre la lógica pura.
 */

import { describe, expect, it } from 'vitest'

// Helper local copiado del patrón de `empleado-menus.ts` para aislar el test
// sin importar todo el módulo (que tira de Prisma).
function parseCutoffTime(cutoff: string): { hours: number; minutes: number } {
  const [hStr, mStr] = cutoff.split(':')
  const hours = hStr ? Number(hStr) : 11
  const minutes = mStr ? Number(mStr) : 0
  return {
    hours: Number.isFinite(hours) ? hours : 11,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  }
}

function isPastCutoff(now: Date, cutoff: string, targetDate: Date): boolean {
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  const current = new Date(now)
  current.setHours(0, 0, 0, 0)

  // Fecha pasada: siempre post-cutoff
  if (target < current) return true

  // Fecha futura: nunca post-cutoff
  if (target > current) return false

  // Mismo día: comparar con la hora de cutoff
  const { hours, minutes } = parseCutoffTime(cutoff)
  const cutoffMoment = new Date(targetDate)
  cutoffMoment.setHours(hours, minutes, 0, 0)
  return now > cutoffMoment
}

describe('parseCutoffTime', () => {
  it('parsea formato HH:mm estándar', () => {
    expect(parseCutoffTime('11:00')).toEqual({ hours: 11, minutes: 0 })
    expect(parseCutoffTime('09:30')).toEqual({ hours: 9, minutes: 30 })
    expect(parseCutoffTime('23:59')).toEqual({ hours: 23, minutes: 59 })
  })

  it('parsea formato HH:mm:ss aceptando HH:mm', () => {
    // ':mm:ss' se parte en ['HH','mm','ss']; cogemos los 2 primeros
    const res = parseCutoffTime('11:00:00')
    expect(res.hours).toBe(11)
    expect(res.minutes).toBe(0)
  })

  it('aplica defaults cuando el input es inválido', () => {
    expect(parseCutoffTime('')).toEqual({ hours: 11, minutes: 0 })
    expect(parseCutoffTime('xx:yy')).toEqual({ hours: 11, minutes: 0 })
  })
})

describe('isPastCutoff', () => {
  // Usamos `new Date(Y, M, D, h, m)` (hora local) para alinear con el setHours
  // que hace el helper — así el test es estable independientemente del TZ del CI.
  const jueves10h = new Date(2026, 3, 16, 10, 0) // 16 abr 2026 10:00 local
  const jueves11h30 = new Date(2026, 3, 16, 11, 30)
  const viernes = new Date(2026, 3, 17, 8, 0)
  const miercoles = new Date(2026, 3, 15, 8, 0)

  it('antes de las 11:00 del día objetivo: no es past cutoff', () => {
    expect(isPastCutoff(jueves10h, '11:00', jueves10h)).toBe(false)
  })

  it('justo después de las 11:00: es past cutoff', () => {
    expect(isPastCutoff(jueves11h30, '11:00', jueves10h)).toBe(true)
  })

  it('un día pasado siempre es past cutoff', () => {
    expect(isPastCutoff(jueves10h, '11:00', miercoles)).toBe(true)
  })

  it('un día futuro nunca es past cutoff', () => {
    expect(isPastCutoff(jueves10h, '11:00', viernes)).toBe(false)
  })
})
