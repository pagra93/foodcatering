/**
 * Página de "Olvidé mi contraseña"
 * Permite solicitar un enlace de recuperación por email
 */

import { type Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const metadata: Metadata = {
  title: 'Recuperar Contraseña · Plati',
  description: 'Solicita un enlace para restablecer tu contraseña',
}

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { sent?: string }
}) {
  const sent = searchParams.sent === '1'
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <Link
          href="/login"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>

        {/* Card con shadcn */}
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">¿Olvidaste tu contraseña?</CardTitle>
              <CardDescription className="mt-2">
                No te preocupes. Ingresa tu email y te enviaremos un enlace para restablecerla.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {sent ? (
              <Alert className="bg-success/10 border-success/30">
                <AlertDescription className="text-success-foreground">
                  Si tu email está registrado, te hemos enviado un enlace para
                  restablecer tu contraseña. Revisa tu bandeja de entrada (y la
                  carpeta de spam). El enlace caduca en 60 minutos.
                </AlertDescription>
              </Alert>
            ) : (
              <>
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
                <Alert className="mt-6 bg-primary/10 border-primary/30">
                  <AlertDescription className="text-primary">
                    <strong>Nota:</strong> Si tu email está registrado, recibirás un enlace en los próximos minutos. Revisa también tu carpeta de spam.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Recordaste tu contraseña?{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary transition-colors"
          >
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  )
}
