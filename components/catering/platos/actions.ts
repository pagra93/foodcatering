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
import { ZodError } from 'zod'
import { getRequiredSession } from '@/lib/auth/session'
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

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

const ADMIN_ROLES = new Set(['ADMIN_CATERING', 'CHEF'])

async function requireCateringAdmin() {
  const session = await getRequiredSession()
  if (session.user.tenantType !== 'CATERING') {
    throw new Error('Tenant no autorizado')
  }
  if (!ADMIN_ROLES.has(session.user.role)) {
    throw new Error('Acceso denegado')
  }
  return session
}

function formatZodError(error: ZodError): string {
  const first = error.errors[0]
  return first ? first.message : 'Datos inválidos'
}

/**
 * Crear un plato nuevo
 */
export async function createDishAction(
  input: CreateDishInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireCateringAdmin()
    const parsed = createDishSchema.parse(input)

    const exists = await dishNameExists(session.user.tenantId, parsed.name)
    if (exists) {
      return { success: false, error: 'Ya existe un plato con ese nombre' }
    }

    const dish = await createDish(session.user.tenantId, parsed)
    revalidatePath('/catering/platos')
    return { success: true, data: { id: dish.id } }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: formatZodError(error) }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Error al crear el plato' }
  }
}

/**
 * Actualizar un plato existente
 */
export async function updateDishAction(
  dishId: string,
  input: UpdateDishInput
): Promise<ActionResult> {
  try {
    const session = await requireCateringAdmin()
    const parsed = updateDishSchema.parse(input)

    if (parsed.name) {
      const exists = await dishNameExists(
        session.user.tenantId,
        parsed.name,
        dishId
      )
      if (exists) {
        return { success: false, error: 'Ya existe otro plato con ese nombre' }
      }
    }

    await updateDish(dishId, session.user.tenantId, parsed)
    revalidatePath('/catering/platos')
    revalidatePath(`/catering/platos/${dishId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: formatZodError(error) }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Error al actualizar el plato' }
  }
}

/**
 * Eliminar un plato (soft delete)
 */
export async function deleteDishAction(dishId: string): Promise<ActionResult> {
  try {
    const session = await requireCateringAdmin()
    await deleteDish(dishId, session.user.tenantId)
    revalidatePath('/catering/platos')
    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Error al eliminar el plato' }
  }
}

/**
 * Clonar un plato
 */
export async function cloneDishAction(
  dishId: string,
  newName?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireCateringAdmin()
    const dish = await cloneDish(dishId, session.user.tenantId, newName)
    revalidatePath('/catering/platos')
    return { success: true, data: { id: dish.id } }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Error al clonar el plato' }
  }
}

/**
 * Activar / desactivar un plato
 */
export async function toggleDishActiveAction(
  dishId: string,
  active: boolean
): Promise<ActionResult> {
  return updateDishAction(dishId, { active })
}
