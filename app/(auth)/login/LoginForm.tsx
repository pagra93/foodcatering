'use client'

/**
 * Formulario de Login con NextAuth + shadcn/ui
 */

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle } from 'lucide-react'

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email o contraseña incorrectos')
        setIsLoading(false)
        return
      }

      if (result?.ok) {
        // ✅ Recargar la página completa para que el Server Component
        // detecte la sesión y redirija al dashboard correcto
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
      {/* Error message */}
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
          disabled={isLoading}
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
          disabled={isLoading}
          placeholder="••••••••"
          className="h-12"
        />
      </div>

      {/* Recordar sesión */}
      <div className="flex items-center space-x-2">
        <Checkbox id="remember" name="remember" disabled={isLoading} />
        <Label
          htmlFor="remember"
          className="text-sm font-normal text-muted-foreground cursor-pointer"
        >
          Recordar sesión
        </Label>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        disabled={isLoading} 
        className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white" 
        size="lg"
      >
        {isLoading ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            Iniciando sesión...
          </>
        ) : (
          'Iniciar sesión'
        )}
      </Button>
    </form>
  )
}
