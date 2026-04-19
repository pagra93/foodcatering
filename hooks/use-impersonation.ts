'use client'

/**
 * Hook de cliente: devuelve si la sesión actual está impersonando a otro usuario.
 *
 * Se movió desde `components/ImpersonationBanner.tsx` para poder reutilizarlo
 * en cualquier componente (navbar, dashboards, etc.) sin acoplarlo al banner.
 *
 * La consulta va a `/api/admin/impersonate/status` y cacha localmente. Un
 * refresh del Next router invalida el estado implicitamente.
 */

import { useEffect, useState } from 'react'

type ImpersonationInfo = {
  isImpersonating: boolean
  expiresAt?: number
  remainingMinutes?: number
  originalUser?: { id: string; role: string }
  targetUser?: { id: string; role: string; tenantId: string }
}

type UseImpersonationResult = {
  isImpersonating: boolean
  isLoading: boolean
  info: ImpersonationInfo | null
  refresh: () => Promise<void>
}

export function useImpersonation(): UseImpersonationResult {
  const [info, setInfo] = useState<ImpersonationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function fetchStatus() {
    try {
      const res = await fetch('/api/admin/impersonate/status')
      if (!res.ok) {
        setInfo({ isImpersonating: false })
        return
      }
      const data = (await res.json()) as ImpersonationInfo
      setInfo(data)
    } catch {
      setInfo({ isImpersonating: false })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchStatus()
  }, [])

  return {
    isImpersonating: info?.isImpersonating ?? false,
    isLoading,
    info,
    refresh: fetchStatus,
  }
}
