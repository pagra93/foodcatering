/**
 * Queries para Menús del Empleado
 * Portal autoservicio de selección de comidas
 */

import { prisma } from '@/lib/db/prisma'
import { startOfWeek, endOfWeek, addDays, format, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { parseDietPrefs } from '@/lib/types/diet-prefs'

function parseCutoffTime(cutoff: string): { hours: number; minutes: number } {
  const [hStr, mStr] = cutoff.split(':')
  const hours = hStr ? Number(hStr) : 11
  const minutes = mStr ? Number(mStr) : 0
  return { hours: Number.isFinite(hours) ? hours : 11, minutes: Number.isFinite(minutes) ? minutes : 0 }
}

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

  const cateringAssignment = employee.site.company.cateringAssignments[0]

  if (!cateringAssignment) {
    throw new Error('No hay catering asignado a esta empresa')
  }

  // Obtener el restaurant por separado usando tenantCatering
  const catering = await prisma.restaurant.findUnique({
    where: { tenantId: cateringAssignment.tenantCatering },
  })

  if (!catering) {
    throw new Error('Catering no encontrado')
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
      tenantId: catering.tenantId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: 'PUBLISHED',
    },
    include: {
      dish: true,
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
    const { hours: cutoffHours, minutes: cutoffMinutes } = parseCutoffTime(cutoffTime)
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
        starters: dayDishes.filter((d) => d.dish.course === 'FIRST').map((d) => d.dish),
        mains: dayDishes.filter((d) => d.dish.course === 'SECOND').map((d) => d.dish),
        desserts: dayDishes.filter((d) => d.dish.course === 'DESSERT').map((d) => d.dish),
      },
      isPastCutoff,
      cutoffTime,
    })
  }

  const dietPrefs = parseDietPrefs(employee.dietPrefs)

  return {
    employee: {
      id: employee.id,
      name: employee.user.nameEnc,
      allergens: dietPrefs.allergies,
      dietPrefs,
    },
    company: {
      name: employee.site.company.legalName,
      dailyLimit: employee.site.company.policy?.limitPerDay ? Number(employee.site.company.policy.limitPerDay) : 11,
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

  const cateringAssignment = employee.site.company.cateringAssignments[0]

  if (!cateringAssignment) {
    throw new Error('No hay catering asignado')
  }

  // Obtener el restaurant por separado usando tenantCatering
  const catering = await prisma.restaurant.findUnique({
    where: { tenantId: cateringAssignment.tenantCatering },
  })

  if (!catering) {
    throw new Error('Catering no encontrado')
  }

  // Verificar cutoff
  const cutoffTime = employee.site.company.policy?.cutoffTime || '11:00:00'
  const { hours: cutoffHours, minutes: cutoffMinutes } = parseCutoffTime(cutoffTime)
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

  // Obtener platos disponibles (con sus alérgenos de la relación DishAllergen)
  const dishSchedules = await prisma.dishSchedule.findMany({
    where: {
      tenantId: catering.tenantId,
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: 'PUBLISHED',
    },
    include: {
      dish: {
        include: {
          allergens: { include: { allergen: { select: { code: true, name: true } } } },
        },
      },
    },
  })

  // Enriquece un plato: alérgenos {code,name}, flags de dieta y kcal.
  const mapDish = (dish: (typeof dishSchedules)[number]['dish']) => {
    const labels = (dish.labels as string[]) ?? []
    const nutrition = (dish.nutrition as { kcal?: number }) ?? {}
    return {
      id: dish.id,
      name: dish.name,
      course: dish.course,
      description: dish.description,
      imageUrl: dish.imageUrl,
      price: Number(dish.basePrice),
      allergens: dish.allergens.map((a) => a.allergen), // {code, name}
      isVegetarian: labels.includes('vegetariano'),
      isVegan: labels.includes('vegano'),
      calories: typeof nutrition.kcal === 'number' ? nutrition.kcal : null,
    }
  }

  const dishes = {
    starters: dishSchedules.filter((d) => d.dish.course === 'FIRST').map((d) => mapDish(d.dish)),
    mains: dishSchedules.filter((d) => d.dish.course === 'SECOND').map((d) => mapDish(d.dish)),
    desserts: dishSchedules.filter((d) => d.dish.course === 'DESSERT').map((d) => mapDish(d.dish)),
  }

  const dietPrefs = parseDietPrefs(employee.dietPrefs)

  // Resolver los códigos de alérgeno del empleado a {code, name} para mostrarlos.
  const employeeAllergens = dietPrefs.allergies.length
    ? await prisma.allergen.findMany({
        where: { code: { in: dietPrefs.allergies } },
        select: { code: true, name: true },
      })
    : []

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
      allergens: employeeAllergens,
      dietPrefs,
      blockAllergensEnabled: dietPrefs.blockAllergensEnabled,
    },
    limits: {
      dailyLimit: employee.site.company.policy?.limitPerDay ? Number(employee.site.company.policy.limitPerDay) : 11,
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
  const { hours: cutoffHours, minutes: cutoffMinutes } = parseCutoffTime(cutoffTime)
  const cutoffDate = new Date(date)
  cutoffDate.setHours(cutoffHours, cutoffMinutes, 0, 0)

  if (new Date() > cutoffDate) {
    throw new Error('No se pueden realizar cambios después del cutoff')
  }

  // Calcular precio total — los platos deben pertenecer a un catering asignado
  // (activo) a la empresa del empleado (L9: evita meter platos de otro catering
  // manipulando los ids).
  const requestedDishIds = [
    selection.starterId,
    selection.mainId,
    selection.dessertId,
  ].filter(Boolean) as string[]

  const assignments = await prisma.companyCateringAssignment.findMany({
    where: { companyId: employee.site.company.id, active: true },
    select: { tenantCatering: true },
  })
  const allowedCateringTenants = assignments.map((a) => a.tenantCatering)

  const dishes = await prisma.dish.findMany({
    where: {
      id: { in: requestedDishIds },
      tenantId: { in: allowedCateringTenants },
    },
  })

  if (dishes.length !== requestedDishIds.length) {
    throw new Error('Algún plato no está disponible en tu catering asignado')
  }

  const totalPrice = dishes.reduce((sum, dish) => sum + Number(dish.basePrice), 0)

  // Verificar límite diario
  const dailyLimit = employee.site.company.policy?.limitPerDay ? Number(employee.site.company.policy.limitPerDay) : 11

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
    // NOTA: tenantCatering se resuelve del catering asignado a la empresa + siteId del empleado
    const companyWithCatering = await prisma.company.findUnique({
      where: { tenantId: employee.tenantId },
      include: {
        cateringAssignments: {
          where: { active: true, type: 'PRIMARY' },
          take: 1,
        },
      },
    })
    const tenantCatering = companyWithCatering?.cateringAssignments[0]?.tenantCatering
    if (!tenantCatering) {
      throw new Error('La empresa no tiene catering asignado')
    }

    return prisma.order.create({
      data: {
        employeeId,
        tenantEmpresa: employee.tenantId,
        tenantCatering,
        siteId: employee.siteId,
        serviceDate: date,
        menuType: 'FULL',
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
  const { hours: cutoffHours, minutes: cutoffMinutes } = parseCutoffTime(cutoffTime)
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

