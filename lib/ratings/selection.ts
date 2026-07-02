/**
 * Utilidad pura (sin Prisma runtime) para extraer los platos de `Order.selection`.
 * Segura para importar tanto en servidor como en cliente.
 */

import type { DishCourse } from '@prisma/client'

type SelectionCourse = { dishId?: string; name?: string } | null | undefined
type OrderSelection = {
  first?: SelectionCourse
  second?: SelectionCourse
  dessert?: SelectionCourse
}

export type SelectionDish = { dishId: string; name: string; course: DishCourse }

/** Extrae los platos (con curso) de `Order.selection`. */
export function dishesFromSelection(selection: unknown): SelectionDish[] {
  const sel = (selection ?? {}) as OrderSelection
  const out: SelectionDish[] = []
  const map: [keyof OrderSelection, DishCourse][] = [
    ['first', 'FIRST'],
    ['second', 'SECOND'],
    ['dessert', 'DESSERT'],
  ]
  for (const [key, course] of map) {
    const c = sel[key]
    if (c?.dishId) out.push({ dishId: c.dishId, name: c.name ?? 'Plato', course })
  }
  return out
}
