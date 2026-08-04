/**
 * Hooks de instrumentación de Next 15.
 *
 * - register(): inicializa Sentry en runtime nodejs SOLO si hay SENTRY_DSN
 *   (opt-in: sin DSN no hay coste ni tráfico).
 * - onRequestError(): TODO error de servidor no capturado queda registrado en
 *   JSON estructurado (pino → stdout) con path/método/requestId para poder
 *   correlacionarlo con lo que reporte el usuario; y en Sentry si está activo.
 *   Antes de esto, los 500 solo existían como stack suelto en el stdout del
 *   contenedor, sin contexto.
 */
export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] === 'nodejs' && process.env['SENTRY_DSN']) {
    const Sentry = await import('@sentry/nextjs')
    Sentry.init({
      dsn: process.env['SENTRY_DSN'],
      environment: process.env.NODE_ENV,
      release: process.env['BUILD_SHA'] || undefined,
      // Solo errores; sin tracing (coste/ruido innecesario hoy).
      tracesSampleRate: 0,
    })
  }
}

type OnRequestError = NonNullable<
  import('next').Instrumentation.onRequestError
>

export const onRequestError: OnRequestError = async (
  error,
  request,
  context
) => {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return

  const { logger } = await import('@/lib/log')
  const headers = request.headers as Record<string, string | string[] | undefined>
  const rawRequestId = headers['x-request-id']
  logger.error(
    {
      err: error,
      method: request.method,
      path: request.path,
      requestId: typeof rawRequestId === 'string' ? rawRequestId : undefined,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
    },
    'unhandled server error'
  )

  if (process.env['SENTRY_DSN']) {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureRequestError(error, request, context)
  }
}
