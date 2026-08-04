'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/shared/ErrorState'

/**
 * Error boundary del portal de empresa.
 */
export default function EmpresaError({
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
      homeHref="/empresa/dashboard"
      homeLabel="Ir al panel de empresa"
    />
  )
}
