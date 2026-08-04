/**
 * Lectura del mensaje de error de una respuesta de API.
 *
 * Client-safe: sin imports de servidor. Las API routes devuelven
 * `{ error: string }` (y a veces `error` es un array de issues de Zod),
 * pero los componentes leían `error.message` — siempre `undefined` con
 * ese shape — y el usuario nunca veía el mensaje real del servidor.
 */

function issueMessage(issue: unknown): string | null {
  if (typeof issue !== 'object' || issue === null || !('message' in issue)) {
    return null
  }
  const { message } = issue as { message: unknown }
  return typeof message === 'string' && message.trim() !== '' ? message : null
}

/**
 * Extrae el mensaje de error del body JSON de una respuesta fallida.
 * Orden de preferencia: `error` string no vacío → `error` array de
 * issues de Zod (une los `message` con '; ') → `message` string →
 * `fallback`. Si el body no es JSON válido, devuelve `fallback`.
 */
export async function readApiError(
  res: Response,
  fallback: string
): Promise<string> {
  try {
    const data: unknown = await res.json()
    if (typeof data !== 'object' || data === null) return fallback

    const { error, message } = data as { error?: unknown; message?: unknown }

    if (typeof error === 'string' && error.trim() !== '') {
      return error
    }

    if (Array.isArray(error)) {
      const messages = error
        .map(issueMessage)
        .filter((m): m is string => m !== null)
      if (messages.length > 0) return messages.join('; ')
    }

    if (typeof message === 'string' && message.trim() !== '') {
      return message
    }

    return fallback
  } catch {
    return fallback
  }
}
