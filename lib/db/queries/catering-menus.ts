/**
 * Queries para Gestión de Menús Semanales del Catering
 * 
 * Operaciones sobre DishSchedule para crear y publicar menús
 */

import { prisma } from '@/lib/db/prisma'
import type { DailyMenuInput, PublishMenusInput, WeeklyMenuQuery } from '@/lib/validations/menu'
import { startOfDay, endOfDay } from 'date-fns'

/**
 * Obtener menús de una semana completa
 */
export async function getWeeklyMenu(tenantId: string, query: WeeklyMenuQuery) {
  const { startDate, endDate } = query

  // Obtener todos los DishSchedules del rango
  const schedules = await prisma.dishSchedule.findMany({
    where: {
      tenantId,
      date: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    },
    include: {
      dish: {
        select: {
          id: true,
          name: true,
          course: true,
          basePrice: true,
          active: true,
          labels: true,
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  })

  // Agrupar por fecha
  const menusByDate: Record<string, any> = {}

  schedules.forEach((schedule) => {
    const dateKey = schedule.date.toISOString().split('T')[0]

    if (!menusByDate[dateKey]) {
      menusByDate[dateKey] = {
        date: schedule.date,
        status: schedule.status,
        firsts: [],
        seconds: [],
        desserts: [],
      }
    }

    const dishData = {
      scheduleId: schedule.id,
      dishId: schedule.dish.id,
      name: schedule.dish.name,
      basePrice: Number(schedule.dish.basePrice),
      priceOverride: schedule.priceOverride ? Number(schedule.priceOverride) : null,
      stockLimit: schedule.stockLimit,
      active: schedule.dish.active,
      labels: schedule.dish.labels as string[],
    }

    switch (schedule.dish.course) {
      case 'FIRST':
        menusByDate[dateKey].firsts.push(dishData)
        break
      case 'SECOND':
        menusByDate[dateKey].seconds.push(dishData)
        break
      case 'DESSERT':
        menusByDate[dateKey].desserts.push(dishData)
        break
    }
  })

  return menusByDate
}

/**
 * Obtener menú de un día específico
 */
export async function getDailyMenu(tenantId: string, date: Date) {
  const schedules = await prisma.dishSchedule.findMany({
    where: {
      tenantId,
      date: startOfDay(date),
    },
    include: {
      dish: {
        select: {
          id: true,
          name: true,
          course: true,
          ingredients: true,
          basePrice: true,
          active: true,
          labels: true,
          nutrition: true,
        },
      },
    },
    orderBy: [
      {
        dish: {
          course: 'asc',
        },
      },
      {
        dish: {
          name: 'asc',
        },
      },
    ],
  })

  const menu = {
    date,
    status: schedules.length > 0 ? schedules[0].status : 'HIDDEN',
    firsts: [] as any[],
    seconds: [] as any[],
    desserts: [] as any[],
  }

  schedules.forEach((schedule) => {
    const dishData = {
      scheduleId: schedule.id,
      dishId: schedule.dish.id,
      name: schedule.dish.name,
      ingredients: schedule.dish.ingredients,
      basePrice: Number(schedule.dish.basePrice),
      priceOverride: schedule.priceOverride ? Number(schedule.priceOverride) : null,
      stockLimit: schedule.stockLimit,
      active: schedule.dish.active,
      labels: schedule.dish.labels as string[],
      nutrition: schedule.dish.nutrition as object,
    }

    switch (schedule.dish.course) {
      case 'FIRST':
        menu.firsts.push(dishData)
        break
      case 'SECOND':
        menu.seconds.push(dishData)
        break
      case 'DESSERT':
        menu.desserts.push(dishData)
        break
    }
  })

  return menu
}

/**
 * Actualizar/crear menú de un día
 */
export async function updateDailyMenu(
  tenantId: string,
  data: DailyMenuInput
) {
  const { date, firsts, seconds, desserts } = data

  return await prisma.$transaction(async (tx) => {
    // 1. Eliminar schedules existentes de ese día
    await tx.dishSchedule.deleteMany({
      where: {
        tenantId,
        date: startOfDay(date),
      },
    })

    // 2. Crear nuevos schedules
    const allDishIds = [...firsts, ...seconds, ...(desserts || [])]

    // Verificar que todos los platos existen y están activos
    const dishes = await tx.dish.findMany({
      where: {
        id: { in: allDishIds },
        tenantId,
        active: true,
        deletedAt: null,
      },
    })

    if (dishes.length !== allDishIds.length) {
      throw new Error('Algunos platos no existen o están inactivos')
    }

    // Crear schedules
    const schedulesToCreate = allDishIds.map((dishId) => ({
      tenantId,
      dishId,
      date: startOfDay(date),
      status: 'HIDDEN' as const, // Por defecto oculto hasta publicar
    }))

    await tx.dishSchedule.createMany({
      data: schedulesToCreate,
    })

    return { success: true }
  })
}

/**
 * Publicar menús de un rango de fechas
 */
export async function publishWeeklyMenu(
  tenantId: string,
  data: PublishMenusInput
) {
  const { startDate, endDate } = data

  return await prisma.$transaction(async (tx) => {
    // 1. Obtener todos los días del rango
    const schedules = await tx.dishSchedule.findMany({
      where: {
        tenantId,
        date: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
      include: {
        dish: {
          select: {
            course: true,
          },
        },
      },
    })

    // 2. Agrupar por fecha y validar
    const dateGroups: Record<string, any[]> = {}

    schedules.forEach((schedule) => {
      const dateKey = schedule.date.toISOString().split('T')[0]
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = []
      }
      dateGroups[dateKey].push(schedule)
    })

    // 3. Validar que cada día tiene primeros y segundos
    const invalidDates: string[] = []

    Object.entries(dateGroups).forEach(([dateKey, daySchedules]) => {
      const hasFirst = daySchedules.some((s) => s.dish.course === 'FIRST')
      const hasSecond = daySchedules.some((s) => s.dish.course === 'SECOND')

      if (!hasFirst || !hasSecond) {
        invalidDates.push(dateKey)
      }
    })

    if (invalidDates.length > 0) {
      throw new Error(
        `Los siguientes días no tienen primeros y segundos: ${invalidDates.join(', ')}`
      )
    }

    // 4. Publicar (actualizar status a PUBLISHED)
    const result = await tx.dishSchedule.updateMany({
      where: {
        tenantId,
        date: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
      data: {
        status: 'PUBLISHED',
      },
    })

    return {
      success: true,
      count: result.count,
    }
  })
}

/**
 * Validar menú antes de publicar (sin actualizar)
 */
export async function validateMenuBeforePublish(
  tenantId: string,
  date: Date
) {
  const schedules = await prisma.dishSchedule.findMany({
    where: {
      tenantId,
      date: startOfDay(date),
    },
    include: {
      dish: {
        select: {
          course: true,
          active: true,
        },
      },
    },
  })

  const errors: string[] = []

  // Verificar que hay platos
  if (schedules.length === 0) {
    errors.push('No hay platos seleccionados para este día')
  }

  // Verificar que hay primeros
  const hasFirst = schedules.some(
    (s) => s.dish.course === 'FIRST' && s.dish.active
  )
  if (!hasFirst) {
    errors.push('Debe tener al menos un primer plato')
  }

  // Verificar que hay segundos
  const hasSecond = schedules.some(
    (s) => s.dish.course === 'SECOND' && s.dish.active
  )
  if (!hasSecond) {
    errors.push('Debe tener al menos un segundo plato')
  }

  // Verificar que todos los platos están activos
  const inactiveDishes = schedules.filter((s) => !s.dish.active)
  if (inactiveDishes.length > 0) {
    errors.push(`Hay ${inactiveDishes.length} plato(s) inactivo(s)`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Ocultar menús (cambiar status a HIDDEN)
 */
export async function hideMenus(
  tenantId: string,
  startDate: Date,
  endDate: Date
) {
  const result = await prisma.dishSchedule.updateMany({
    where: {
      tenantId,
      date: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    },
    data: {
      status: 'HIDDEN',
    },
  })

  return {
    success: true,
    count: result.count,
  }
}

/**
 * Actualizar stock limit de un plato en un día
 */
export async function updateStockLimit(
  scheduleId: string,
  tenantId: string,
  stockLimit: number | null
) {
  const schedule = await prisma.dishSchedule.findFirst({
    where: {
      id: scheduleId,
      tenantId,
    },
  })

  if (!schedule) {
    throw new Error('Schedule not found')
  }

  const updated = await prisma.dishSchedule.update({
    where: { id: scheduleId },
    data: { stockLimit },
  })

  return {
    id: updated.id,
    stockLimit: updated.stockLimit,
  }
}

/**
 * Actualizar precio override de un plato en un día
 */
export async function updatePriceOverride(
  scheduleId: string,
  tenantId: string,
  priceOverride: number | null
) {
  const schedule = await prisma.dishSchedule.findFirst({
    where: {
      id: scheduleId,
      tenantId,
    },
  })

  if (!schedule) {
    throw new Error('Schedule not found')
  }

  const updated = await prisma.dishSchedule.update({
    where: { id: scheduleId },
    data: { priceOverride },
  })

  return {
    id: updated.id,
    priceOverride: updated.priceOverride ? Number(updated.priceOverride) : null,
  }
}

/**
 * Obtener estadísticas de menús
 */
export async function getMenusStats(tenantId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const next7Days = new Date(today)
  next7Days.setDate(today.getDate() + 7)

  const [totalSchedules, publishedNext7Days, uniqueDates] = await Promise.all([
    prisma.dishSchedule.count({
      where: {
        tenantId,
        date: { gte: today },
      },
    }),
    prisma.dishSchedule.count({
      where: {
        tenantId,
        date: {
          gte: today,
          lt: next7Days,
        },
        status: 'PUBLISHED',
      },
    }),
    prisma.dishSchedule
      .findMany({
        where: {
          tenantId,
          date: { gte: today },
          status: 'PUBLISHED',
        },
        select: {
          date: true,
        },
        distinct: ['date'],
      })
      .then((schedules) => schedules.length),
  ])

  return {
    totalSchedules,
    publishedNext7Days,
    uniquePublishedDates: uniqueDates,
  }
}

