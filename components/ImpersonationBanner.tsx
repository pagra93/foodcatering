/**
 * ImpersonationBanner - Barra visual que indica cuando un super admin está impersonando
 * 
 * Se muestra en la parte superior de la página cuando hay impersonación activa
 */

'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, LogOut, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

type ImpersonationInfo = {
  isImpersonating: boolean
  originalUser?: {
    id: string
    role: string
  }
  targetUser?: {
    id: string
    role: string
    tenantId: string
  }
  expiresAt?: number
  remainingMinutes?: number
}

export function ImpersonationBanner() {
  const router = useRouter()
  const [info, setInfo] = useState<ImpersonationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStopping, setIsStopping] = useState(false)
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null)

  // Cargar información de impersonación
  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await fetch('/api/admin/impersonate/status')
        const data = await res.json()
        setInfo(data)
        setRemainingMinutes(data.remainingMinutes || null)
      } catch (error) {
        console.error('[ImpersonationBanner] Error loading info:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInfo()
  }, [])

  // Actualizar contador cada minuto
  useEffect(() => {
    if (!info?.isImpersonating || !info.expiresAt) return

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((info.expiresAt! - Date.now()) / 1000 / 60)
      )
      setRemainingMinutes(remaining)

      // Si expiró, recargar página
      if (remaining === 0) {
        router.refresh()
      }
    }, 60000) // cada minuto

    return () => clearInterval(interval)
  }, [info, router])

  // Función para terminar impersonación
  async function handleStopImpersonation() {
    if (isStopping) return

    setIsStopping(true)

    try {
      const res = await fetch('/api/admin/impersonate/stop', {
        method: 'POST',
      })

      if (res.ok) {
        // Redirigir al dashboard de super admin
        window.location.href = '/admin'
      } else {
        const data = await res.json()
        alert(data.error || 'Error al terminar impersonación')
      }
    } catch (error) {
      console.error('[ImpersonationBanner] Error stopping:', error)
      alert('Error al terminar impersonación')
    } finally {
      setIsStopping(false)
    }
  }

  // No mostrar si está cargando o no hay impersonación
  if (isLoading || !info?.isImpersonating) {
    return null
  }

  return (
    <div className="fixed left-0 right-0 top-0 z-50 border-b-2 border-orange-600 bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-4">
        {/* Icono + Mensaje */}
        <div className="flex items-center gap-3 text-white">
          <AlertTriangle className="h-5 w-5 animate-pulse" />
          <div>
            <p className="text-sm font-semibold">
              Modo Impersonación Activa
            </p>
            <p className="text-xs opacity-90">
              Viendo como: <span className="font-medium">{info.targetUser?.role}</span> en tenant{' '}
              <span className="font-mono text-xs">{info.targetUser?.tenantId.slice(0, 8)}...</span>
            </p>
          </div>
        </div>

        {/* Tiempo restante */}
        {remainingMinutes !== null && (
          <div className="flex items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-white backdrop-blur-sm">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {remainingMinutes} min restantes
            </span>
          </div>
        )}

        {/* Botón para salir */}
        <button
          onClick={handleStopImpersonation}
          disabled={isStopping}
          className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {isStopping ? 'Saliendo...' : 'Salir de Impersonación'}
        </button>
      </div>
    </div>
  )
}

/**
 * Hook para usar en componentes que necesiten saber si hay impersonación
 */
export function useImpersonation() {
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/admin/impersonate/status')
        const data = await res.json()
        setIsImpersonating(data.isImpersonating || false)
      } catch (error) {
        console.error('[useImpersonation] Error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    check()
  }, [])

  return { isImpersonating, isLoading }
}

