'use client'

import { useEffect } from 'react'

/**
 * Boundary global de último recurso: se activa cuando falla el propio
 * root layout, al que sustituye. Por eso debe renderizar su propio
 * <html> y <body> y no puede depender de estilos globales, fuentes ni
 * providers — solo estilos inline.
 */
export default function GlobalError({
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
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          backgroundColor: '#f8fafc',
          color: '#0f172a',
        }}
      >
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                marginBottom: '0.75rem',
              }}
            >
              Algo ha salido mal
            </h1>
            <p
              style={{
                color: '#475569',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
              }}
            >
              Se ha producido un error inesperado. Puedes reintentarlo o
              volver a la página principal.
            </p>
            {error.digest && (
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  marginBottom: '1.5rem',
                }}
              >
                Código de referencia: {error.digest}
              </p>
            )}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={reset}
                style={{
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Reintentar
              </button>
              {/* Recarga completa a propósito: si falla el root layout, el
                  router de la app no es fiable (por eso tampoco <Link />). */}
              <button
                type="button"
                onClick={() => window.location.assign('/')}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
