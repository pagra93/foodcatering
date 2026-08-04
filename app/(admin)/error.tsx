'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/shared/ErrorState'

/**
 * Error boundary del portal de administración.
 */
export default function AdminError({
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
      homeHref="/admin"
      homeLabel="Ir al panel de administración"
    />
  )
}
