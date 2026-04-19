/**
 * Tests para la lógica de festivos efectivos y días hábiles (Sprint 8).
 * Mockea prisma para no depender de la BD real.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock prisma antes de importar el módulo.
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    holiday: { findMany: vi.fn() },
    holidayOverride: { findMany: vi.fn() },
  },
}))

import { prisma } from '@/lib/db/prisma'
import {
  getEffectiveHolidays,
  isBusinessDay,
} from '@/lib/db/queries/catalogs'

const TENANT = '00000000-0000-4000-8000-000000000abc'

type HolidayRow = {
  id: string
  date: Date
  name: string
  scope: 'NATIONAL' | 'REGION' | 'TENANT'
  tenantId: string | null
}
type OverrideRow = { holidayId: string; disabled: boolean }

function mockHolidays(official: HolidayRow[], own: HolidayRow[]) {
  const findMany = prisma.holiday.findMany as unknown as ReturnType<typeof vi.fn>
  findMany.mockImplementation((args: any) => {
    const scope = args.where.scope
    if (scope === 'TENANT') return Promise.resolve(own)
    return Promise.resolve(official)
  })
}

function mockOverrides(rows: OverrideRow[]) {
  const findMany = prisma.holidayOverride.findMany as unknown as ReturnType<
    typeof vi.fn
  >
  findMany.mockResolvedValue(rows)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getEffectiveHolidays', () => {
  it('combina oficiales + propios del tenant', async () => {
    mockHolidays(
      [
        {
          id: 'h1',
          date: new Date('2026-01-01'),
          name: 'Año Nuevo',
          scope: 'NATIONAL',
          tenantId: null,
        },
      ],
      [
        {
          id: 'h2',
          date: new Date('2026-06-15'),
          name: 'Aniversario',
          scope: 'TENANT',
          tenantId: TENANT,
        },
      ]
    )
    mockOverrides([])

    const result = await getEffectiveHolidays(TENANT, 2026)
    expect(result).toHaveLength(2)
    // Ordenado cronológicamente
    expect(result[0]?.toISOString().slice(0, 10)).toBe('2026-01-01')
    expect(result[1]?.toISOString().slice(0, 10)).toBe('2026-06-15')
  })

  it('excluye festivos oficiales con override disabled=true', async () => {
    mockHolidays(
      [
        {
          id: 'h1',
          date: new Date('2026-01-01'),
          name: 'Año Nuevo',
          scope: 'NATIONAL',
          tenantId: null,
        },
        {
          id: 'h2',
          date: new Date('2026-05-01'),
          name: 'Día del Trabajo',
          scope: 'NATIONAL',
          tenantId: null,
        },
      ],
      []
    )
    mockOverrides([{ holidayId: 'h1', disabled: true }])

    const result = await getEffectiveHolidays(TENANT, 2026)
    expect(result).toHaveLength(1)
    expect(result[0]?.toISOString().slice(0, 10)).toBe('2026-05-01')
  })

  it('un override con disabled=false NO excluye (comportamiento default)', async () => {
    mockHolidays(
      [
        {
          id: 'h1',
          date: new Date('2026-01-01'),
          name: 'Año Nuevo',
          scope: 'NATIONAL',
          tenantId: null,
        },
      ],
      []
    )
    mockOverrides([{ holidayId: 'h1', disabled: false }])

    const result = await getEffectiveHolidays(TENANT, 2026)
    expect(result).toHaveLength(1)
  })

  it('deduplica si oficial y propio caen el mismo día', async () => {
    const sameDate = new Date('2026-12-25')
    mockHolidays(
      [
        {
          id: 'h1',
          date: sameDate,
          name: 'Navidad',
          scope: 'NATIONAL',
          tenantId: null,
        },
      ],
      [
        {
          id: 'h2',
          date: sameDate,
          name: 'Cierre técnico',
          scope: 'TENANT',
          tenantId: TENANT,
        },
      ]
    )
    mockOverrides([])

    const result = await getEffectiveHolidays(TENANT, 2026)
    expect(result).toHaveLength(1)
  })
})

describe('isBusinessDay', () => {
  beforeEach(() => {
    // Mocks limpios sin festivos por defecto
    mockHolidays([], [])
    mockOverrides([])
  })

  it('sábado no es día hábil', async () => {
    // 2026-01-03 es sábado
    const result = await isBusinessDay(TENANT, new Date('2026-01-03T12:00:00'))
    expect(result).toBe(false)
  })

  it('domingo no es día hábil', async () => {
    // 2026-01-04 es domingo
    const result = await isBusinessDay(TENANT, new Date('2026-01-04T12:00:00'))
    expect(result).toBe(false)
  })

  it('miércoles sin festivo SÍ es día hábil', async () => {
    // 2026-01-07 es miércoles
    const result = await isBusinessDay(TENANT, new Date('2026-01-07T12:00:00'))
    expect(result).toBe(true)
  })

  it('festivo nacional en día de semana NO es hábil', async () => {
    mockHolidays(
      [
        {
          id: 'h1',
          date: new Date('2026-01-01'),
          name: 'Año Nuevo',
          scope: 'NATIONAL',
          tenantId: null,
        },
      ],
      []
    )
    // 2026-01-01 es jueves
    const result = await isBusinessDay(TENANT, new Date('2026-01-01T12:00:00'))
    expect(result).toBe(false)
  })

  it('festivo overridado (24/7) SÍ es hábil para ese tenant', async () => {
    mockHolidays(
      [
        {
          id: 'h1',
          date: new Date('2026-01-01'),
          name: 'Año Nuevo',
          scope: 'NATIONAL',
          tenantId: null,
        },
      ],
      []
    )
    mockOverrides([{ holidayId: 'h1', disabled: true }])

    const result = await isBusinessDay(TENANT, new Date('2026-01-01T12:00:00'))
    expect(result).toBe(true)
  })
})
