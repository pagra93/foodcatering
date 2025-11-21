'use client'

/**
 * Formulario de Login con NextAuth + shadcn/ui
 */

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const callbackUrl = searchParams.get('callbackUrl') || '/admin'

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
        router.push(callbackUrl)
        router.refresh()
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

      {/* Votre adresse email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-normal text-gray-700">
          Votre adresse email
        </Label>
        <Input
          type="email"
          id="email"
          name="email"
          required
          autoComplete="email"
          disabled={isLoading}
          placeholder=""
          className="h-12"
        />
      </div>

      {/* Votre mot de passe */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-normal text-gray-700">
          Votre mot de passe
        </Label>
        <Input
          type="password"
          id="password"
          name="password"
          required
          autoComplete="current-password"
          disabled={isLoading}
          placeholder=""
          className="h-12"
        />
      </div>

      {/* Clef de passe oublié? */}
      <div className="flex items-center space-x-2">
        <Checkbox id="remember" name="remember" disabled={isLoading} />
        <Label
          htmlFor="remember"
          className="text-sm font-normal text-gray-600 cursor-pointer"
        >
          Clef de passe oublié?
        </Label>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        disabled={isLoading} 
        className="w-full h-12 bg-black hover:bg-gray-800 text-white" 
        size="lg"
      >
        {isLoading ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            Chargement...
          </>
        ) : (
          'Étape suivante'
        )}
      </Button>
    </form>
  )
}
