/**
 * Server Actions para gestión de platos del catering.
 *
 * Sustituyen los fetch a `/api/catering/platos/*` desde las páginas que se
 * renderizan como Server Components. Las rutas API siguen existiendo para
 * callers externos (móvil, integraciones), pero las páginas del portal usan
 * estas actions directamente.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { getRequiredSession } from '@/lib/auth/session'
import { permittedAction } from '@/lib/auth/permissions'
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'
import {
  cloneDish,
  createDish,
  deleteDish,
  dishNameExists,
  updateDish,
} from '@/lib/db/queries/catering-dishes'
import {
  createDishSchema,
  updateDishSchema,
  type CreateDishInput,
  type UpdateDishInput,
} from '@/lib/validations/dish'

const ADMIN_ROLES = new Set(['ADMIN_CATERING', 'CHEF'])

/**
 * La capa de queries (`lib/db/queries/catering-dishes`) lanza `Error` planos
 * con mensajes de negocio que el usuario debe ver ('Dish not found'…). Hasta
 * que esa capa emita `DomainError`, aquí se traducen los `Error` planos
 * (constructor exacto `Error`, sin `digest` de Next) para que `withAction` no
 * los degrade al mensaje genérico. Los errores de infraestructura (Prisma,
 * TypeError…) son subclases y siguen su camino hacia el genérico + log.
 */
async function fromQueries<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (
      error instanceof Error &&
      error.constructor === Error &&
      !('digest' in error)
    ) {
      throw new DomainError(error.message, 400)
    }
    throw error
  }
}

async function requireCateringAdmin() {
  const session = await getRequiredSession()
  if (session.user.tenantType !== 'CATERING') {
    throw new DomainError('Tenant no autorizado', 403)
  }
  if (!ADMIN_ROLES.has(session.user.role)) {
    throw new DomainError('Acceso denegado', 403)
  }
  return session
}

/**
 * Crear un plato nuevo
 */
export async function createDishAction(
  input: CreateDishInput
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const session = await requireCateringAdmin()
    if (
      !permittedAction(
        session.user.permissions,
        session.user.role,
        'dish:create',
        [...ADMIN_ROLES]
      )
    ) {
      throw new DomainError('No tienes permiso para crear platos', 403)
    }
    const parsed = createDishSchema.parse(input)

    const exists = await dishNameExists(session.user.tenantId, parsed.name)
    if (exists) {
      throw new DomainError('Ya existe un plato con ese nombre', 409)
    }

    const dish = await fromQueries(() =>
      createDish(session.user.tenantId, parsed)
    )
    revalidatePath('/catering/platos')
    return { id: dish.id }
  })
}

/**
 * Actualizar un plato existente
 */
export async function updateDishAction(
  dishId: string,
  input: UpdateDishInput
): Promise<ActionResult<void>> {
  return withAction(async () => {
    const session = await requireCateringAdmin()
    if (
      !permittedAction(
        session.user.permissions,
        session.user.role,
        'dish:edit',
        [...ADMIN_ROLES]
      )
    ) {
      throw new DomainError('No tienes permiso para editar platos', 403)
    }
    const parsed = updateDishSchema.parse(input)

    if (parsed.name) {
      const exists = await dishNameExists(
        session.user.tenantId,
        parsed.name,
        dishId
      )
      if (exists) {
        throw new DomainError('Ya existe otro plato con ese nombre', 409)
      }
    }

    await fromQueries(() => updateDish(dishId, session.user.tenantId, parsed))
    revalidatePath('/catering/platos')
    revalidatePath(`/catering/platos/${dishId}`)
  })
}

/**
 * Eliminar un plato (soft delete)
 */
export async function deleteDishAction(
  dishId: string
): Promise<ActionResult<void>> {
  return withAction(async () => {
    const session = await requireCateringAdmin()
    if (
      !permittedAction(
        session.user.permissions,
        session.user.role,
        'dish:delete',
        [...ADMIN_ROLES]
      )
    ) {
      throw new DomainError('No tienes permiso para eliminar platos', 403)
    }
    await fromQueries(() => deleteDish(dishId, session.user.tenantId))
    revalidatePath('/catering/platos')
  })
}

/**
 * Clonar un plato
 */
export async function cloneDishAction(
  dishId: string,
  newName?: string
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const session = await requireCateringAdmin()
    if (
      !permittedAction(
        session.user.permissions,
        session.user.role,
        'dish:clone',
        [...ADMIN_ROLES]
      )
    ) {
      throw new DomainError('No tienes permiso para clonar platos', 403)
    }
    const dish = await fromQueries(() =>
      cloneDish(dishId, session.user.tenantId, newName)
    )
    revalidatePath('/catering/platos')
    return { id: dish.id }
  })
}

/**
 * Activar / desactivar un plato
 */
export async function toggleDishActiveAction(
  dishId: string,
  active: boolean
): Promise<ActionResult<void>> {
  // Primero la puerta de permiso específica del toggle; después se delega en
  // `updateDishAction` (que aplica su propio permiso `dish:edit`), igual que
  // hacía la implementación anterior.
  const gate = await withAction(async () => {
    const session = await requireCateringAdmin()
    if (
      !permittedAction(
        session.user.permissions,
        session.user.role,
        'dish:toggle-active',
        [...ADMIN_ROLES]
      )
    ) {
      throw new DomainError(
        'No tienes permiso para activar o desactivar platos',
        403
      )
    }
  })
  if (!gate.success) return gate
  return updateDishAction(dishId, { active })
}
