/**
 * Página de Error de Autenticación
 * Muestra errores específicos de NextAuth
 */

import { type Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const metadata: Metadata = {
  title: 'Error de Autenticación · Plati',
  description: 'Hubo un problema al iniciar sesión',
}

const errorMessages: Record<string, string> = {
  Configuration: 'Hay un problema de configuración en el servidor.',
  AccessDenied: 'Acceso denegado. No tienes permisos para acceder.',
  Verification: 'El token de verificación ha expirado o ya fue usado.',
  Default: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
  CredentialsSignin: 'Email o contraseña incorrectos. Verifica tus credenciales.',
  SessionRequired: 'Debes iniciar sesión para acceder a este recurso.',
}

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const errorType = searchParams.error || 'Default'
  const errorMessage = errorMessages[errorType] || errorMessages['Default']

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Card con shadcn */}
        <Card className="shadow-lg border-destructive/30">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-2xl">Error de Autenticación</CardTitle>
              <CardDescription className="mt-2 text-destructive">
                {errorMessage}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Info Box con shadcn Alert */}
            <Alert className="bg-destructive/10 border-destructive/30">
              <AlertDescription className="text-destructive">
                <strong>Código de error:</strong> {errorType}
              </AlertDescription>
            </Alert>

            {/* Actions con shadcn Button */}
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link href="/login">
                  Volver a intentar
                </Link>
              </Button>

              {errorType === 'CredentialsSignin' && (
                <Button asChild variant="outline" className="w-full" size="lg">
                  <Link href="/forgot-password">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Necesitas ayuda?{' '}
          <Link
            href="/contact"
            className="font-medium text-primary hover:text-primary transition-colors"
          >
            Contacta con soporte
          </Link>
        </p>
      </div>
    </div>
  )
}
