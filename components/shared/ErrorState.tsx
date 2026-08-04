import Link from 'next/link'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ErrorStateProps = {
  title?: string
  message?: string
  digest?: string
  onRetry?: () => void
  homeHref: string
  homeLabel: string
}

/**
 * Estado de error compartido para los error boundaries de la app.
 *
 * Presentacional puro: no lleva 'use client' para poder usarse también
 * desde Server Components (sin `onRetry`). Los boundaries `error.tsx`
 * (client) le pasan `reset` como `onRetry`.
 */
export function ErrorState({
  title = 'Algo ha salido mal',
  message = 'Se ha producido un error inesperado. Puedes reintentarlo o volver al inicio.',
  digest,
  onRetry,
  homeHref,
  homeLabel,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        {/* Icono */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-5 dark:bg-red-900/20">
            <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Título */}
        <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h1>

        {/* Mensaje */}
        <p className="mb-6 text-slate-600 dark:text-slate-400">{message}</p>

        {/* Referencia para soporte */}
        {digest && (
          <p className="mb-6 font-mono text-xs text-slate-400 dark:text-slate-500">
            Código de referencia: {digest}
          </p>
        )}

        {/* Acciones */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          {onRetry && (
            <Button onClick={onRetry}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={homeHref}>
              <Home className="mr-2 h-4 w-4" />
              {homeLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
