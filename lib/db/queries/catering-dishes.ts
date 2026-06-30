/**
 * Queries para Gestión de Platos del Catering
 * 
 * CRUD completo + búsqueda + filtros + clonar
 */

import { prisma } from '@/lib/db/prisma'
import { type Prisma } from '@prisma/client'
import type { DishFilters, CreateDishInput, UpdateDishInput } from '@/lib/validations/dish'

/** Relación de alérgenos a incluir y su serialización a {id, code, name}. */
const allergenInclude = {
  allergens: { include: { allergen: { select: { id: true, code: true, name: true } } } },
} satisfies Prisma.DishInclude

type DishWithAllergens = { allergens: { allergen: { id: string; code: string; name: string } }[] }
function serializeAllergens(dish: DishWithAllergens) {
  return dish.allergens.map((a) => a.allergen)
}

/**
 * Obtener lista de platos con filtros
 */
export async function getDishes(tenantId: string, filters: DishFilters) {
  const {
    search,
    course,
    active,
    allergens,
    tags,
    page,
    pageSize,
    sortBy,
    sortOrder,
  } = filters

  // Construir where clause
  const where: any = {
    tenantId,
    deletedAt: null,
  }

  // Filtro por búsqueda (solo nombre, ingredients no existe en schema)
  if (search) {
    where.name = { contains: search, mode: 'insensitive' }
  }

  // Filtro por tipo de plato
  if (course) {
    where.course = course
  }

  // Filtro por activo
  if (active !== 'all') {
    where.active = active === 'true'
  }

  // Filtro por alérgenos (platos que referencien alguno de los IDs dados)
  if (allergens && allergens.length > 0) {
    where.allergens = {
      some: { allergenId: { in: allergens } },
    }
  }

  // Filtro por tags nutricionales (siguen en labels)
  if (tags && tags.length > 0) {
    where.labels = {
      hasSome: tags,
    }
  }

  // Calcular skip
  const skip = (page - 1) * pageSize

  // Construir orderBy
  const orderBy: any = {}
  orderBy[sortBy] = sortOrder

  // Ejecutar queries en paralelo
  const [dishes, total] = await Promise.all([
    prisma.dish.findMany({
      where,
      include: {
        ...allergenInclude,
        schedules: {
          where: {
            date: {
              gte: new Date(),
            },
            status: 'PUBLISHED',
          },
          select: {
            date: true,
          },
          take: 5,
        },
        _count: {
          select: {
            schedules: true,
          },
        },
      },
      skip,
      take: pageSize,
      orderBy,
    }),
    prisma.dish.count({ where }),
  ])

  // Serializar datos
  const serializedDishes = dishes.map((dish) => ({
    id: dish.id,
    name: dish.name,
    course: dish.course,
    labels: dish.labels as string[],
    allergens: serializeAllergens(dish),
    nutrition: dish.nutrition as object,
    basePrice: Number(dish.basePrice),
    active: dish.active,
    createdAt: dish.createdAt,
    updatedAt: dish.updatedAt,
    scheduledDates: dish.schedules.map((s) => s.date),
    schedulesCount: dish._count.schedules,
  }))

  return {
    dishes: serializedDishes,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

/**
 * Obtener un plato por ID
 */
export async function getDishById(dishId: string, tenantId: string) {
  const dish = await prisma.dish.findFirst({
    where: {
      id: dishId,
      tenantId,
      deletedAt: null,
    },
    include: {
      ...allergenInclude,
      restaurant: {
        select: {
          id: true,
          displayName: true,
        },
      },
      schedules: {
        where: {
          status: 'PUBLISHED',
        },
        select: {
          id: true,
          date: true,
          stockLimit: true,
          status: true,
        },
        orderBy: {
          date: 'asc',
        },
      },
    },
  })

  if (!dish) {
    return null
  }

  const allergens = serializeAllergens(dish)

  // Serializar
  return {
    id: dish.id,
    name: dish.name,
    course: dish.course,
    labels: dish.labels as string[],
    allergens,
    allergenIds: allergens.map((a) => a.id),
    nutrition: dish.nutrition as object,
    basePrice: Number(dish.basePrice),
    active: dish.active,
    createdAt: dish.createdAt,
    updatedAt: dish.updatedAt,
    restaurant: dish.restaurant,
    schedules: dish.schedules,
  }
}

/**
 * Crear un plato nuevo
 */
export async function createDish(tenantId: string, data: CreateDishInput) {
  // Obtener el restaurantId del tenant
  const restaurant = await prisma.restaurant.findFirst({
    where: { tenantId },
    select: { id: true },
  })

  if (!restaurant) {
    throw new Error('Restaurant not found for this tenant')
  }

  // labels solo guarda etiquetas nutricionales; los alérgenos van a DishAllergen.
  const labels = data.tags ?? []
  const allergenIds = data.allergens ?? []

  // Crear el plato + sus alérgenos (relación)
  const dish = await prisma.dish.create({
    data: {
      tenantId,
      restaurantId: restaurant.id,
      name: data.name,
      course: data.course,
      description: data.description ?? null,
      ingredients: data.ingredients,
      imageUrl: data.imageUrl || null,
      labels,
      nutrition: (data.nutrition ?? {}) as Prisma.InputJsonValue,
      basePrice: data.basePrice,
      active: data.active,
      ...(allergenIds.length > 0 && {
        allergens: { create: allergenIds.map((allergenId) => ({ allergenId })) },
      }),
    },
  })

  return {
    id: dish.id,
    name: dish.name,
    course: dish.course,
    labels: dish.labels as string[],
    nutrition: dish.nutrition as object,
    basePrice: Number(dish.basePrice),
    active: dish.active,
    createdAt: dish.createdAt,
    updatedAt: dish.updatedAt,
  }
}

/**
 * Actualizar un plato
 */
export async function updateDish(
  dishId: string,
  tenantId: string,
  data: UpdateDishInput
) {
  // Verificar que el plato existe y pertenece al tenant
  const existingDish = await prisma.dish.findFirst({
    where: {
      id: dishId,
      tenantId,
      deletedAt: null,
    },
  })

  if (!existingDish) {
    throw new Error('Dish not found')
  }

  // Preparar datos de actualización
  const updateData: any = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.course !== undefined) updateData.course = data.course
  if (data.basePrice !== undefined) updateData.basePrice = data.basePrice
  if (data.active !== undefined) updateData.active = data.active
  if (data.nutrition !== undefined) updateData.nutrition = data.nutrition
  if (data.description !== undefined) updateData.description = data.description
  if (data.ingredients !== undefined) updateData.ingredients = data.ingredients
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null

  // Tags nutricionales → labels (los alérgenos ya no van aquí)
  if (data.tags !== undefined) {
    updateData.labels = data.tags
  }

  // Alérgenos → reemplazar la relación DishAllergen completa
  if (data.allergens !== undefined) {
    updateData.allergens = {
      deleteMany: {},
      create: data.allergens.map((allergenId) => ({ allergenId })),
    }
  }

  // Actualizar
  const dish = await prisma.dish.update({
    where: { id: dishId },
    data: updateData,
  })

  return {
    id: dish.id,
    name: dish.name,
    course: dish.course,
    labels: dish.labels as string[],
    nutrition: dish.nutrition as object,
    basePrice: Number(dish.basePrice),
    active: dish.active,
    createdAt: dish.createdAt,
    updatedAt: dish.updatedAt,
  }
}

/**
 * Eliminar un plato (soft delete)
 */
export async function deleteDish(dishId: string, tenantId: string) {
  // Verificar que el plato existe y pertenece al tenant
  const dish = await prisma.dish.findFirst({
    where: {
      id: dishId,
      tenantId,
      deletedAt: null,
    },
    include: {
      schedules: {
        where: {
          date: {
            gte: new Date(),
          },
          status: 'PUBLISHED',
        },
        select: {
          id: true,
          date: true,
        },
      },
    },
  })

  if (!dish) {
    throw new Error('Dish not found')
  }

  // Verificar que no tiene menús futuros publicados
  if (dish.schedules.length > 0) {
    throw new Error(
      `No se puede eliminar. El plato está en ${dish.schedules.length} menú(s) futuro(s)`
    )
  }

  // Soft delete
  await prisma.dish.update({
    where: { id: dishId },
    data: {
      deletedAt: new Date(),
      active: false, // También marcarlo como inactivo
    },
  })

  return { success: true }
}

/**
 * Clonar un plato
 */
export async function cloneDish(
  dishId: string,
  tenantId: string,
  newName?: string
) {
  // Obtener el plato original + sus alérgenos
  const originalDish = await prisma.dish.findFirst({
    where: {
      id: dishId,
      tenantId,
      deletedAt: null,
    },
    include: { allergens: { select: { allergenId: true } } },
  })

  if (!originalDish) {
    throw new Error('Dish not found')
  }

  // Crear el nombre del clon
  const clonedName = newName || `${originalDish.name} (Copia)`

  // Crear el clon (copiando la relación de alérgenos)
  const clonedDish = await prisma.dish.create({
    data: {
      tenantId: originalDish.tenantId,
      restaurantId: originalDish.restaurantId,
      name: clonedName,
      course: originalDish.course,
      description: originalDish.description,
      ingredients: originalDish.ingredients,
      imageUrl: originalDish.imageUrl,
      labels: (originalDish.labels ?? []) as Prisma.InputJsonValue,
      nutrition: (originalDish.nutrition ?? {}) as Prisma.InputJsonValue,
      basePrice: originalDish.basePrice,
      active: originalDish.active,
      ...(originalDish.allergens.length > 0 && {
        allergens: {
          create: originalDish.allergens.map((a) => ({ allergenId: a.allergenId })),
        },
      }),
    },
  })

  return {
    id: clonedDish.id,
    name: clonedDish.name,
    course: clonedDish.course,
    labels: clonedDish.labels as string[],
    nutrition: clonedDish.nutrition as object,
    basePrice: Number(clonedDish.basePrice),
    active: clonedDish.active,
    createdAt: clonedDish.createdAt,
    updatedAt: clonedDish.updatedAt,
  }
}

/**
 * Verificar si un nombre de plato ya existe
 */
export async function dishNameExists(
  tenantId: string,
  name: string,
  excludeDishId?: string
) {
  const where: any = {
    tenantId,
    name: {
      equals: name,
      mode: 'insensitive',
    },
    deletedAt: null,
  }

  if (excludeDishId) {
    where.id = { not: excludeDishId }
  }

  const count = await prisma.dish.count({ where })

  return count > 0
}

/**
 * Obtener estadísticas de platos
 */
export async function getDishesStats(tenantId: string) {
  const [total, active, byType] = await Promise.all([
    prisma.dish.count({
      where: { tenantId, deletedAt: null },
    }),
    prisma.dish.count({
      where: { tenantId, active: true, deletedAt: null },
    }),
    prisma.dish.groupBy({
      by: ['course'],
      where: { tenantId, active: true, deletedAt: null },
      _count: true,
    }),
  ])

  return {
    total,
    active,
    inactive: total - active,
    byType: byType.map((item) => ({
      course: item.course,
      count: item._count,
    })),
  }
}

