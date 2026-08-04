'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/shared/ErrorState'

/**
 * Error boundary del portal del catering.
 */
export default function CateringError({
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
      homeHref="/catering/dashboard"
      homeLabel="Ir al panel del catering"
    />
  )
}
