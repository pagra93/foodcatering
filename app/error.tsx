'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/shared/ErrorState'

/**
 * Error boundary global: captura los errores de render no gestionados
 * por los boundaries de cada portal.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ErrorState
      digest={error.digest}
      onRetry={reset}
      homeHref="/"
      homeLabel="Volver al inicio"
    />
  )
}
