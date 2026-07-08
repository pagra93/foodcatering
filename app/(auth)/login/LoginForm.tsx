'use client'

/**
 * Formulario de Login con NextAuth + shadcn/ui.
 * Soporta un segundo paso de MFA (TOTP) cuando la cuenta lo tiene activado (F2):
 * si el servidor responde `code: 'mfa_required'`, se revela el campo de código.
 */

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, ShieldCheck } from 'lucide-react'

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpRequired, setOtpRequired] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const otp = (formData.get('otp') as string | null)?.trim() || undefined

    try {
      const result = await signIn('credentials', {
        email,
        password,
        ...(otp ? { otp } : {}),
        redirect: false,
      })

      // Segundo factor requerido: revelar el campo de código.
      if (result?.code === 'mfa_required') {
        setOtpRequired(true)
        setError(null)
        setIsLoading(false)
        return
      }
      if (result?.code === 'mfa_invalid') {
        setOtpRequired(true)
        setError('Código de verificación incorrecto. Inténtalo de nuevo.')
        setIsLoading(false)
        return
      }

      if (result?.error) {
        setError('Email o contraseña incorrectos')
        setIsLoading(false)
        return
      }

      if (result?.ok) {
        // Recargar para que el Server Component detecte la sesión y redirija.
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Error en login:', error)
      setError('Error al iniciar sesión. Inténtalo de nuevo.')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-normal text-foreground">
          Email
        </Label>
        <Input
          type="email"
          id="email"
          name="email"
          required
          autoComplete="email"
          disabled={isLoading || otpRequired}
          placeholder="tu@empresa.com"
          className="h-12"
        />
      </div>

      {/* Contraseña */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-normal text-foreground">
          Contraseña
        </Label>
        <Input
          type="password"
          id="password"
          name="password"
          required
          autoComplete="current-password"
          disabled={isLoading || otpRequired}
          placeholder="••••••••"
          className="h-12"
        />
      </div>

      {/* Segundo factor (MFA) — aparece cuando el servidor lo pide */}
      {otpRequired && (
        <div className="space-y-2">
          <Label htmlFor="otp" className="flex items-center gap-2 text-sm font-normal text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Código de verificación
          </Label>
          <Input
            type="text"
            id="otp"
            name="otp"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            disabled={isLoading}
            placeholder="123456"
            className="h-12 tracking-widest"
          />
          <p className="text-xs text-muted-foreground">
            Introduce el código de 6 dígitos de tu app de autenticación (o un
            código de recuperación).
          </p>
        </div>
      )}

      {/* Recordar sesión */}
      {!otpRequired && (
        <div className="flex items-center space-x-2">
          <Checkbox id="remember" name="remember" disabled={isLoading} />
          <Label
            htmlFor="remember"
            className="text-sm font-normal text-muted-foreground cursor-pointer"
          >
            Recordar sesión
          </Label>
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white"
        size="lg"
      >
        {isLoading ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            {otpRequired ? 'Verificando...' : 'Iniciando sesión...'}
          </>
        ) : otpRequired ? (
          'Verificar y entrar'
        ) : (
          'Iniciar sesión'
        )}
      </Button>
    </form>
  )
}
