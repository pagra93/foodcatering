/**
 * Envoltorio estándar para Server Actions: convierte errores en un resultado
 * tipado que el cliente SIEMPRE debe inspeccionar (nada de `.catch(() => {})`).
 *
 * Contrato:
 * - Errores de control de flujo de Next (redirect/notFound, digest `NEXT_*`)
 *   se re-lanzan tal cual: el framework los necesita.
 * - `DomainError` → su mensaje es apto para el usuario final: se devuelve.
 * - `ZodError` → se devuelve el primer issue en formato legible.
 * - Cualquier otro error → `console.error` (queda en los logs del servidor,
 *   correlacionable por requestId) + mensaje genérico (no se filtran internos).
 *
 * Uso:
 *   export async function miAction(input: unknown): Promise<ActionResult<Foo>> {
 *     return withAction(async () => {
 *       const data = schema.parse(input)   // ZodError → error legible
 *       ...
 *       return foo
 *     })
 *   }
 */

import { ZodError } from 'zod'
import { DomainError } from '@/lib/errors'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Errores internos de Next (redirect(), notFound()…) llevan un `digest` que
 * empieza por `NEXT_`. No son fallos: hay que dejarlos propagar.
 */
function isNextControlFlowError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_')
  )
}

/** Primer issue de un ZodError en una frase legible para el usuario. */
function firstZodIssueMessage(error: ZodError): string {
  const issue = error.issues[0]
  if (!issue) return 'Datos inválidos.'
  const path = issue.path.join('.')
  return path ? `${path}: ${issue.message}` : issue.message
}

export async function withAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    if (isNextControlFlowError(error)) throw error
    if (error instanceof DomainError) {
      return { success: false, error: error.message }
    }
    if (error instanceof ZodError) {
      return { success: false, error: firstZodIssueMessage(error) }
    }
    console.error('[action] error no controlado:', error)
    return {
      success: false,
      error: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
    }
  }
}
