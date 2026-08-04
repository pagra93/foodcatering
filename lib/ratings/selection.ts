/**
 * Utilidad pura (sin Prisma runtime) para extraer los platos de `Order.selection`.
 * Segura para importar tanto en servidor como en cliente.
 */

import type { DishCourse } from '@prisma/client'
import { parseOrderSelection } from '@/lib/orders/selection'

type LegacyCourse = { dishId?: unknown; name?: unknown } | null | undefined
type LegacySelection = {
  first?: LegacyCourse
  second?: LegacyCourse
  dessert?: LegacyCourse
}

export type SelectionDish = { dishId: string; name: string; course: DishCourse }

/**
 * Extrae los platos (con curso) de `Order.selection`, en forma canónica o
 * legacy. La forma canónica solo lleva ids: pasa los nombres hidratados de BD
 * en `names` (Map dishId→nombre); si faltan, cae al nombre legacy o a 'Plato'.
 */
export function dishesFromSelection(
  selection: unknown,
  names?: Map<string, string>
): SelectionDish[] {
  const sel = parseOrderSelection(selection)
  const legacy = (selection ?? {}) as LegacySelection
  const legacyName = (c: LegacyCourse): string | undefined =>
    typeof c?.name === 'string' && c.name.length > 0 ? c.name : undefined

  const entries: Array<[string | undefined, DishCourse, LegacyCourse]> = [
    [sel.starterId, 'FIRST', legacy.first],
    [sel.mainId, 'SECOND', legacy.second],
    [sel.dessertId, 'DESSERT', legacy.dessert],
  ]

  const out: SelectionDish[] = []
  for (const [dishId, course, legacyCourse] of entries) {
    if (!dishId) continue
    out.push({
      dishId,
      name: names?.get(dishId) ?? legacyName(legacyCourse) ?? 'Plato',
      course,
    })
  }
  return out
}
