/**
 * Contrato CANÓNICO de `Order.selection`: `{ starterId?, mainId?, dessertId? }`
 * — los ids de plato por curso, tal y como los escribe el portal empleado.
 *
 * Históricamente convivieron TRES formas: la canónica, la de los seeds
 * (`{ first: { dishId, name }, second, dessert }`) y una que solo existió en
 * código lector (`firstId/secondId/dessertId`). Ese desajuste hacía que las
 * facturas catering→empresa salieran casi a 0 € y que las valoraciones no
 * encontraran platos. La migración `20260804110000_order_selection_canonical`
 * normaliza los datos existentes; este parser sigue aceptando las formas
 * legacy como cinturón de seguridad.
 *
 * Módulo puro (sin Prisma runtime): importable desde servidor y cliente.
 */

export type CanonicalSelection = {
  starterId?: string
  mainId?: string
  dessertId?: string
}

type LegacyCourse = { dishId?: unknown; name?: unknown } | null | undefined

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function parseOrderSelection(selection: unknown): CanonicalSelection {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) {
    return {}
  }
  const sel = selection as Record<string, unknown>

  // Legacy que solo existió en código lector: { firstId, secondId, dessertId }.
  // Se comprueba ANTES que la canónica porque comparte la clave `dessertId`
  // (firstId/secondId son inequívocas de esta forma).
  if ('firstId' in sel || 'secondId' in sel) {
    return {
      starterId: str(sel['firstId']),
      mainId: str(sel['secondId']),
      dessertId: str(sel['dessertId']),
    }
  }

  // Forma canónica
  if ('starterId' in sel || 'mainId' in sel || 'dessertId' in sel) {
    return {
      starterId: str(sel['starterId']),
      mainId: str(sel['mainId']),
      dessertId: str(sel['dessertId']),
    }
  }

  // Legacy de seeds: { first: { dishId }, second: { dishId }, dessert: { dishId } }
  if ('first' in sel || 'second' in sel || 'dessert' in sel) {
    return {
      starterId: str((sel['first'] as LegacyCourse)?.dishId),
      mainId: str((sel['second'] as LegacyCourse)?.dishId),
      dessertId: str((sel['dessert'] as LegacyCourse)?.dishId),
    }
  }

  return {}
}

/** Ids de plato presentes en la selección (acepta cualquier forma). */
export function selectionDishIds(selection: unknown): string[] {
  const sel = parseOrderSelection(selection)
  return [sel.starterId, sel.mainId, sel.dessertId].filter(
    (id): id is string => Boolean(id)
  )
}
