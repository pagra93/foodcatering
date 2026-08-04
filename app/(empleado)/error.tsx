'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/shared/ErrorState'

/**
 * Error boundary del portal del empleado.
 */
export default function EmpleadoError({
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
      homeHref="/empleado/menus"
      homeLabel="Ir a mis menús"
    />
  )
}
