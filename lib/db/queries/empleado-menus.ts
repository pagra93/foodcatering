/**
 * Queries para Menús del Empleado
 * Portal autoservicio de selección de comidas
 */

import { prisma } from '@/lib/db/prisma'
import { startOfWeek, endOfWeek, addDays, format, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

// ============================================================================
// OBTENER MENÚS DE LA SEMANA PARA EMPLEADO
// ============================================================================

export async function getWeekMenusForEmployee(
  employeeId: string,
  weekStart?: Date
) {
  const startDate = weekStart ? startOfWeek(weekStart, { weekStartsOn: 1 }) : startOfWeek(new Date(), { weekStartsOn: 1 })
  const endDate = endOfWeek(startDate, { weekStartsOn: 1 })

  // Obtener datos del empleado y su empresa
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: true,
      site: {
        include: {
          company: {
            include: {
              policy: true,
              cateringAssignments: {
                where: {
                  active: true,
                  type: 'PRIMARY',
                },
                include: {
                  restaurant: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!employee) {
    throw new Error('Empleado no encontrado')
  }

  const catering = employee.site.company.cateringAssignments[0]?.restaurant

  if (!catering) {
    throw new Error('No hay catering asignado a esta empresa')
  }

  // Obtener pedidos existentes del empleado en esta semana
  const orders = await prisma.order.findMany({
    where: {
      employeeId,
      serviceDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      serviceDate: true,
      status: true,
      menuType: true,
      selection: true,
      price: true,
      lockedAt: true,
    },
  })

  // Obtener menús programados para esta semana
  const dishSchedules = await prisma.dishSchedule.findMany({
    where: {
      restaurantId: catering.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
      active: true,
    },
    include: {
      dish: {
        include: {
          allergens: true,
        },
      },
    },
  })

  // Construir array de días de la semana
  const weekDays = []
  for (let i = 0; i < 5; i++) {
    // Lunes a Viernes
    const day = addDays(startDate, i)
    const dayKey = format(day, 'yyyy-MM-dd')

    // Buscar pedido existente para este día
    const existingOrder = orders.find(
      (o) => format(o.serviceDate, 'yyyy-MM-dd') === dayKey
    )

    // Buscar platos disponibles para este día
    const dayDishes = dishSchedules.filter(
      (ds) => format(ds.date, 'yyyy-MM-dd') === dayKey
    )

    // Verificar si ya pasó el cutoff
    const cutoffTime = employee.site.company.policy?.cutoffTime || '11:00:00'
    const [cutoffHours, cutoffMinutes] = cutoffTime.split(':').map(Number)
    const cutoffDate = new Date(day)
    cutoffDate.setHours(cutoffHours, cutoffMinutes, 0, 0)
    const isPastCutoff = new Date() > cutoffDate

    // Determinar estado del día
    let status: 'PENDING' | 'CONFIRMED' | 'LOCKED' | 'CANCELLED' | 'DELIVERED' = 'PENDING'
    
    if (existingOrder) {
      if (existingOrder.status === 'DELIVERED') status = 'DELIVERED'
      else if (existingOrder.status === 'CANCELLED_BEFORE_CUTOFF' || existingOrder.status === 'NO_SHOW') status = 'CANCELLED'
      else if (existingOrder.lockedAt || isPastCutoff) status = 'LOCKED'
      else if (existingOrder.status === 'CONFIRMED') status = 'CONFIRMED'
    } else if (isPastCutoff) {
      status = 'PENDING' // Aún puede seleccionar si no ha pasado el día
    }

    weekDays.push({
      date: day,
      dayName: format(day, 'EEEE', { locale: es }),
      dayNumber: format(day, 'd'),
      monthName: format(day, 'MMMM', { locale: es }),
      status,
      order: existingOrder
        ? {
            id: existingOrder.id,
            selection: existingOrder.selection,
            price: existingOrder.price ? Number(existingOrder.price) : 0,
          }
        : null,
      availableDishes: {
        starters: dayDishes.filter((d) => d.dish.course === 'STARTER').map((d) => d.dish),
        mains: dayDishes.filter((d) => d.dish.course === 'MAIN').map((d) => d.dish),
        desserts: dayDishes.filter((d) => d.dish.course === 'DESSERT').map((d) => d.dish),
      },
      isPastCutoff,
      cutoffTime,
    })
  }

  return {
    employee: {
      id: employee.id,
      name: employee.user.nameEnc,
      allergens: employee.allergens || [],
      dietPrefs: employee.dietPrefs || [],
    },
    company: {
      name: employee.site.company.legalName,
      dailyLimit: employee.site.company.policy?.dailyLimit ? Number(employee.site.company.policy.dailyLimit) : 11,
    },
    catering: {
      name: catering.legalName,
    },
    week: {
      startDate,
      endDate,
      days: weekDays,
    },
  }
}

// ============================================================================
// OBTENER MENÚ DE UN DÍA ESPECÍFICO
// ============================================================================

export async function getDayMenuForEmployee(
  employeeId: string,
  date: Date
) {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  // Obtener datos del empleado
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      site: {
        include: {
          company: {
            include: {
              policy: true,
              cateringAssignments: {
                where: {
                  active: true,
                  type: 'PRIMARY',
                },
                include: {
                  restaurant: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!employee) {
    throw new Error('Empleado no encontrado')
  }

  const catering = employee.site.company.cateringAssignments[0]?.restaurant

  if (!catering) {
    throw new Error('No hay catering asignado')
  }

  // Verificar cutoff
  const cutoffTime = employee.site.company.policy?.cutoffTime || '11:00:00'
  const [cutoffHours, cutoffMinutes] = cutoffTime.split(':').map(Number)
  const cutoffDate = new Date(date)
  cutoffDate.setHours(cutoffHours, cutoffMinutes, 0, 0)
  const isPastCutoff = new Date() > cutoffDate

  // Obtener pedido existente
  const existingOrder = await prisma.order.findFirst({
    where: {
      employeeId,
      serviceDate: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  })

  // Obtener platos disponibles
  const dishSchedules = await prisma.dishSchedule.findMany({
    where: {
      restaurantId: catering.id,
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
      active: true,
    },
    include: {
      dish: true,
    },
  })

  const dishes = {
    starters: dishSchedules
      .filter((d) => d.dish.course === 'STARTER')
      .map((d) => ({
        ...d.dish,
        price: Number(d.dish.price),
      })),
    mains: dishSchedules
      .filter((d) => d.dish.course === 'MAIN')
      .map((d) => ({
        ...d.dish,
        price: Number(d.dish.price),
      })),
    desserts: dishSchedules
      .filter((d) => d.dish.course === 'DESSERT')
      .map((d) => ({
        ...d.dish,
        price: Number(d.dish.price),
      })),
  }

  return {
    date,
    isPastCutoff,
    cutoffTime,
    canEdit: !isPastCutoff && (!existingOrder || existingOrder.status === 'CONFIRMED'),
    existingOrder: existingOrder
      ? {
          id: existingOrder.id,
          selection: existingOrder.selection,
          status: existingOrder.status,
        }
      : null,
    dishes,
    employee: {
      allergens: employee.allergens || [],
      dietPrefs: employee.dietPrefs || [],
      blockAllergensEnabled: employee.blockAllergensEnabled || false,
    },
    limits: {
      dailyLimit: employee.site.company.policy?.dailyLimit ? Number(employee.site.company.policy.dailyLimit) : 11,
    },
  }
}

// ============================================================================
// CREAR O ACTUALIZAR PEDIDO DEL DÍA
// ============================================================================

export type CreateOrderInput = {
  employeeId: string
  date: Date
  selection: {
    starterId?: string
    mainId: string
    dessertId?: string
  }
}

export async function createOrUpdateOrder(input: CreateOrderInput) {
  const { employeeId, date, selection } = input

  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  // Verificar cutoff
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      site: {
        include: {
          company: {
            include: {
              policy: true,
            },
          },
        },
      },
    },
  })

  if (!employee) {
    throw new Error('Empleado no encontrado')
  }

  const cutoffTime = employee.site.company.policy?.cutoffTime || '11:00:00'
  const [cutoffHours, cutoffMinutes] = cutoffTime.split(':').map(Number)
  const cutoffDate = new Date(date)
  cutoffDate.setHours(cutoffHours, cutoffMinutes, 0, 0)

  if (new Date() > cutoffDate) {
    throw new Error('No se pueden realizar cambios después del cutoff')
  }

  // Calcular precio total
  const dishes = await prisma.dish.findMany({
    where: {
      id: {
        in: [selection.starterId, selection.mainId, selection.dessertId].filter(Boolean) as string[],
      },
    },
  })

  const totalPrice = dishes.reduce((sum, dish) => sum + Number(dish.price), 0)

  // Verificar límite diario
  const dailyLimit = employee.site.company.policy?.dailyLimit ? Number(employee.site.company.policy.dailyLimit) : 11

  if (totalPrice > dailyLimit) {
    throw new Error(`El precio total (${totalPrice}€) excede el límite diario de ${dailyLimit}€`)
  }

  // Buscar pedido existente
  const existingOrder = await prisma.order.findFirst({
    where: {
      employeeId,
      serviceDate: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  })

  if (existingOrder) {
    // Actualizar pedido existente
    return prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        selection,
        price: totalPrice,
        status: 'CONFIRMED',
        updatedAt: new Date(),
      },
    })
  } else {
    // Crear nuevo pedido
    return prisma.order.create({
      data: {
        employeeId,
        tenantEmpresa: employee.tenantId,
        serviceDate: date,
        menuType: 'DIARIO',
        selection,
        price: totalPrice,
        status: 'CONFIRMED',
        createdBy: employee.userId,
        lastModifiedBy: employee.userId,
        integrityHash: `hash-${Date.now()}-${Math.random()}`,
      },
    })
  }
}

// ============================================================================
// CANCELAR PEDIDO
// ============================================================================

export async function cancelOrder(employeeId: string, orderId: string) {
  // Verificar que el pedido pertenece al empleado
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      employeeId,
    },
  })

  if (!order) {
    throw new Error('Pedido no encontrado')
  }

  // Obtener employee para verificar cutoff
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      site: {
        include: {
          company: {
            include: {
              policy: true,
            },
          },
        },
      },
    },
  })

  if (!employee) {
    throw new Error('Empleado no encontrado')
  }

  // Verificar cutoff
  const cutoffTime = employee.site.company.policy?.cutoffTime || '11:00:00'
  const [cutoffHours, cutoffMinutes] = cutoffTime.split(':').map(Number)
  const cutoffDate = new Date(order.serviceDate)
  cutoffDate.setHours(cutoffHours, cutoffMinutes, 0, 0)

  if (new Date() > cutoffDate) {
    throw new Error('No se puede cancelar después del cutoff')
  }

  // Cancelar pedido
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'CANCELLED_BEFORE_CUTOFF',
      updatedAt: new Date(),
    },
  })
}

