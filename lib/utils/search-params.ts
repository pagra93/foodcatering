/**
 * Saneo de searchParams numéricos.
 *
 * Los searchParams llegan como strings arbitrarios controlados por el
 * usuario: `?page=abc` produce `NaN`, que al llegar a Prisma
 * (`skip: NaN`) revienta la página con un PrismaClientValidationError.
 * Estos helpers garantizan enteros válidos con fallback seguro.
 */

type SearchParamValue = string | string[] | undefined

/**
 * Parsea el parámetro `page` de searchParams: entero finito >= 1.
 * @param value - Valor crudo del searchParam
 * @param fallback - Valor por defecto si el valor no es válido (1)
 */
export function parsePageParam(value: SearchParamValue, fallback = 1): number {
  return parseIntParam(value, { min: 1, fallback })
}

/**
 * Parsea un entero de searchParams con validación de rango
 * (year, month, pageSize…). Devuelve `fallback` si el valor no es un
 * entero finito o queda fuera de los límites indicados.
 */
export function parseIntParam(
  value: SearchParamValue,
  opts: { min?: number; max?: number; fallback: number }
): number {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === undefined || raw.trim() === '') return opts.fallback

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return opts.fallback
  }
  if (opts.min !== undefined && parsed < opts.min) return opts.fallback
  if (opts.max !== undefined && parsed > opts.max) return opts.fallback

  return parsed
}
