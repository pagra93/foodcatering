/**
 * Página de "Olvidé mi contraseña"
 * Permite solicitar un enlace de recuperación por email
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const metadata: Metadata = {
  title: 'Recuperar Contraseña | Comidas',
  description: 'Solicita un enlace para restablecer tu contraseña',
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <Link
          href="/login"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>

        {/* Card con shadcn */}
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Key className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">¿Olvidaste tu contraseña?</CardTitle>
              <CardDescription className="mt-2">
                No te preocupes. Ingresa tu email y te enviaremos un enlace para restablecerla.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {/* Form con shadcn */}
            <form action="/api/auth/forgot-password" method="POST" className="space-y-5">
              {/* Email con shadcn Input + Label */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="tu@email.com"
                />
              </div>

              {/* Submit Button con shadcn Button */}
              <Button type="submit" className="w-full" size="lg">
                Enviar enlace de recuperación
              </Button>
            </form>

            {/* Info con shadcn Alert */}
            <Alert className="mt-6 bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800">
                <strong>Nota:</strong> Si tu email está registrado, recibirás un enlace en los próximos minutos. Revisa también tu carpeta de spam.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-600">
          ¿Recordaste tu contraseña?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  )
}
